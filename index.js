const path = require('path');
const methodValidator = require('ut-swagger2-validator');
const swaggerParser = require('@apidevtools/swagger-parser');
const convertJoi = require('ut-joi').convert;
const Boom = require('@hapi/boom');

const emptyDoc = (namespace = 'custom', version = '0.0.1') => ({
    swagger: '2.0',
    info: {
        title: namespace,
        description: 'UT Microservice API',
        version
    },
    paths: {}
});

const rpcProps = method => ({
    id: {
        schema: {
            oneOf: [
                {type: 'string'},
                {type: 'number'}
            ]
        },
        example: '1'
    },
    jsonrpc: {
        type: 'string',
        enum: ['2.0'],
        example: '2.0'
    },
    method: {
        type: 'string',
        enum: [method],
        example: method
    }
});

async function registerOpenApiAsync(
    document,
    swaggerRoutes,
    errors
) {
    let result;
    switch (typeof document) {
        case 'function':
            result = document();
            break;
        case 'string':
            result = await swaggerParser.bundle(document);
            break;
        default:
            result = document || emptyDoc();
    }

    await swaggerParser.validate(result);
    const dereferenced = await swaggerParser.dereference(result);
    if (dereferenced?.swagger && (!dereferenced?.securityDefinitions || !Object.keys(dereferenced.securityDefinitions).length)) throw errors['bus.securityDefinitions']();
    if (dereferenced?.openapi && (!dereferenced?.components?.securitySchemes || !Object.keys(dereferenced.components.securitySchemes).length)) throw errors['bus.securitySchemes']();
    const getRoutePath = path => [result.basePath, path].filter(Boolean).join('');

    Object.entries(result.paths).forEach(([path, methods]) => !path.startsWith('x-') &&
        Object.entries(methods).forEach(([method, schema]) => {
            if (method.startsWith('x-')) return;
            const {operationId, responses} = schema;
            if (!operationId) throw new Error('operationId must be defined');
            const successCodes = Object.keys(responses).map(x => +x).filter(code => code >= 200 && code < 300);
            if (successCodes.length !== 1) throw new Error('Exactly one successful HTTP status code must be defined');
            const [namespace] = operationId.split('.');
            if (!swaggerRoutes[namespace]) swaggerRoutes[namespace] = [];
            swaggerRoutes[namespace].push({
                document: dereferenced,
                method,
                schema,
                path: getRoutePath(path),
                operationId,
                successCode: successCodes[0],
                errorTransform: schema['x-ut-errorTransform'] || methods['x-ut-errorTransform'] || result.paths['x-ut-errorTransform']
            });
        })
    );
    return result;
}

const authStrategy = (securityItems, {securityDefinitions = {}, swagger, openapi, components: {securitySchemes = {}} = {}}) => {
    if (!securityItems) return false;
    const mapper = {
        2: security => [
            'swagger',
            securityDefinitions[Object.keys(security)[0]].type
        ].join('.'),
        3: security => [
            'openapi',
            securitySchemes[Object.keys(security)[0]].type,
            securitySchemes[Object.keys(security)[0]].scheme
        ].filter(Boolean).join('.')
    }[(swagger || openapi).split('.')[0]];
    return {
        mode: 'required',
        strategies: Array.from(new Set(securityItems.map(mapper)))
    };
};

module.exports = async(config = {}, errors, issuers, internal) => {
    const swaggerRoutes = {};
    const pending = [];
    const documents = {};

    function registerOpenApi(map) {
        Object.entries(map).forEach(([name, document]) => {
            const doc = registerOpenApiAsync(
                document,
                swaggerRoutes,
                errors
            );
            if (!documents[name]) documents[name] = {};
            documents[name].doc = doc;
            pending.push(doc);
            return doc;
        });
    }

    if (config.document) registerOpenApi({rest: config.document});

    const routesMap = new Map();

    function register(where, moduleName, method, path, value) {
        let map = where.get(moduleName);
        if (!map) {
            map = {};
            where.set(moduleName, map);
        }
        map[`${method.toUpperCase()} ${path}`] = value;
    }
    function unregister(where, moduleName, method, path) {
        const map = where.get(moduleName);
        if (!map) return;
        if (!method && !path) {
            where.set(moduleName, {});
        } else {
            delete map[`${method.toUpperCase()} ${path}`];
        }
    }

    async function apidoc(namespace) {
        await Promise.all(pending);
        if (namespace) {
            const {doc, map} = documents[namespace] || {paths: {}};
            const result = await doc;
            if (map) {
                const paths = result.paths;
                for (const mod of map.values()) {
                    Object.entries(mod).forEach(([name, value]) => {
                        const [method, path] = name.split(' ', 2);
                        if (!paths[path]) paths[path] = {};
                        paths[path][method.toLowerCase()] = value;
                    });
                }
            }
            return result;
        } else {
            return Promise.all(Object.entries(documents).map(async([name, value]) => [name, await value.doc]));
        }
    };

    const uiRoutes = (config.doc !== false) && require('./ui')({service: config.service, version: config.version, ...config.ui, apidoc, issuers, internal}).routes;
    if (uiRoutes) uiRoutes.forEach(route => register(routesMap, 'utApi', route.method, route.path, route));

    return {
        apiCss: path.join(__dirname, 'docs', 'api.css'),
        apiList: require('./api'),
        uiRoutes,
        registerOpenApi,
        rpcRoutes(definitions, moduleName) {
            const result = definitions.map(({
                method,
                description,
                notes,
                params,
                result,
                body,
                validate,
                version,
                route: path = '/rpc/' + method.replace(/\./g, '/'),
                httpMethod = 'POST',
                auth = config.auth,
                app,
                pre,
                tags,
                handler,
                cors,
                cache,
                id,
                security,
                timeout
            }) => {
                if (!description) description = method;
                if (!notes) notes = method;
                const bodySchema =
                    (validate && validate.payload && (validate.payload !== true) && convertJoi(validate.payload)) ||
                    (app && app.payload && convertJoi(app.payload)) ||
                {
                    type: 'object',
                    additionalProperties: false,
                    required: ['id', 'jsonrpc', 'method', 'params'],
                    properties: {
                        ...rpcProps(method),
                        timeout: {
                            type: 'number',
                            example: null,
                            nullable: true
                        },
                        ...params && {params: (typeof params.describe === 'function') ? convertJoi(params) : params}
                    }
                };
                const resultSchema = (result && (typeof result.describe === 'function')) ? convertJoi(result) : result;
                const namespace = method.split('.')[0];
                if (!documents[namespace]) {
                    documents[namespace] = {
                        doc: emptyDoc(namespace, version),
                        map: new Map()
                    };
                }
                const document = documents[namespace];
                register(document.map, moduleName, httpMethod, path, {
                    tags: [moduleName ? `rpc/${method.split('.')[0]} (${moduleName}@${version})` : `rpc/${method.split('.')[0]}`],
                    summary: description,
                    description: [].concat(notes).join('\n'),
                    operationId: method,
                    parameters: [bodySchema && {
                        name: 'body',
                        in: 'body',
                        description: 'body',
                        required: true,
                        schema: bodySchema
                    }].filter(Boolean),
                    responses: {
                        default: {
                            description: 'Invalid request',
                            schema: {}
                        },
                        200: {
                            description: 'Successful response',
                            schema: !resultSchema ? {
                                type: 'object'
                            } : {
                                type: 'object',
                                additionalProperties: false,
                                required: ['id', 'jsonrpc', 'method'],
                                properties: {
                                    ...rpcProps(method),
                                    ...resultSchema && {result: resultSchema}
                                }
                            }
                        }
                    }
                });
                return {
                    method: httpMethod,
                    path,
                    options: {
                        auth,
                        description,
                        notes,
                        ...body && {payload: body},
                        validate,
                        app,
                        pre,
                        tags,
                        handler,
                        cors,
                        cache,
                        id,
                        security,
                        timeout
                    }
                };
            });
            if (moduleName) result.forEach(route => register(routesMap, moduleName, route.method, route.path, route));
            return result;
        },
        async restRoutes({namespace, fn, object, logger, debug}) {
            await Promise.all(pending);
            if (!swaggerRoutes[namespace]) return [];
            const result = swaggerRoutes[namespace].map(({
                document,
                method,
                path,
                schema,
                operationId,
                successCode,
                errorTransform
            }) => {
                const validate = methodValidator(document, path, method);
                const transform = async(error, statusCode) => {
                    let result;
                    if (errorTransform) {
                        const [payload] = await fn.call(object, {...error}, {mtid: 'request', method: errorTransform});
                        result = Boom.boomify(error, {statusCode: statusCode || 500});
                        result.output.payload = payload;
                    } else {
                        const payload = debug ? {
                            ...error
                        } : {
                            message: error.message,
                            type: error.type
                        };
                        result = Boom.boomify(error, {statusCode: statusCode || 500});
                        Object.assign(result.output.payload, payload);
                    }
                    result.output.headers['x-envoy-decorator-operation'] = operationId;
                    return result;
                };
                return {
                    method,
                    path: path && path.split('?')[0],
                    options: {
                        auth: authStrategy(schema.security || document.security, document),
                        handler: async(request, h) => {
                            const {params, query, payload, headers, auth} = request;

                            const validation = await validate.request({
                                query,
                                body: payload,
                                headers,
                                pathParameters: params
                            });
                            if (validation.length > 0) {
                                const message = validation.reduce((errMessages, v) => {
                                    const {errors, name} = v;
                                    if (errors && Array.isArray(errors) && errors.length > 0) {
                                        errMessages.push(...errors.map(err => err.instancePath
                                            ? `${name}, ${err.instancePath} ${err.message}`
                                            : `${name} ${err.message}`
                                        ));
                                    }
                                    return errMessages;
                                }, []).join(', ');
                                const error = errors['bus.requestValidation']({
                                    validation,
                                    params: {
                                        method: operationId,
                                        message
                                    }
                                });
                                logger?.error?.(error);
                                throw await transform(error, 400);
                            }

                            const msg = {
                                ...(Array.isArray(payload) ? {list: payload} : payload),
                                ...params,
                                ...query
                            };

                            let body, mtid;
                            try {
                                [body, {mtid}] = await fn.call(object, msg, {
                                    mtid: 'request',
                                    method: operationId,
                                    auth,
                                    httpRequest: {
                                        url: request.url,
                                        state: request.state,
                                        headers
                                    }
                                });
                            } catch (e) {
                                throw await transform(e);
                            }
                            if (mtid === 'error') {
                                throw await transform(body instanceof Error ? body : {}, body?.statusCode);
                            }
                            const responseValidation = await validate.response({status: successCode, body});
                            if (responseValidation.length > 0) {
                                const message = responseValidation.reduce((errMessages, v) => {
                                    const {errors} = v;
                                    if (errors && Array.isArray(errors) && errors.length > 0) {
                                        errMessages.push(...errors.map(err => err.instancePath
                                            ? `${err.instancePath} ${err.message}`
                                            : `response ${err.message}`
                                        ));
                                    }
                                    return errMessages;
                                }, []).join(', ');
                                const validationError = errors['bus.responseValidation']({
                                    validation: responseValidation,
                                    params: {
                                        path: request.path,
                                        message
                                    }
                                });
                                logger?.error?.(validationError);
                                throw await transform(validationError);
                            }
                            return h
                                .response(body)
                                .header('x-envoy-decorator-operation', operationId)
                                .code(successCode);
                        }
                    }
                };
            });
            result.forEach(route => register(routesMap, namespace, route.method, route.path, route));
            return result;
        },
        route(routes, moduleName = 'utApi') {
            [].concat(routes).forEach(route => register(routesMap, moduleName, route.method, route.path, route));
        },
        deleteRoute({namespace, method, path}) {
            unregister(routesMap, namespace, method, path);
            Object.values(documents).forEach(({map}) => {
                if (map) unregister(map, namespace, method, path);
            });
        },
        routes() {
            const result = new Map();
            for (const map of routesMap.values()) {
                Object.entries(map).forEach(([key, value]) => result.set(key, value));
            }
            return Array.from(result.values());
        }
    };
};
