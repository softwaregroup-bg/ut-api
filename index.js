const path = require('path');
const methodValidator = require('ut-swagger2-validator');
const swaggerParser = require('@apidevtools/swagger-parser');
const convertJoi = require('ut-joi').convert;
const Boom = require('@hapi/boom');

const rpcProps = method => ({
    id: {
        type: ['string', 'number'],
        example: '1'
    },
    jsonrpc: {
        type: 'string',
        const: '2.0',
        example: '2.0'
    },
    method: {
        type: 'string',
        const: method,
        example: method
    }
});

const formatPath = (standard, {
    tags,
    summary,
    description,
    operationId,
    bodySchema,
    resultSchema
}) => ({
    tags,
    summary,
    description,
    operationId,
    ...(standard === 'swagger') ? {
        parameters: [bodySchema && {
            name: 'body',
            in: 'body',
            description: 'body',
            required: true,
            schema: bodySchema
        }].filter(Boolean),
        produces: ['application/json'],
        responses: {
            default: {
                description: 'Invalid request',
                schema: {}
            },
            200: {
                description: 'Successful response',
                schema: resultSchema
            }
        }
    } : { // openapi
        ...bodySchema && {
            requestBody: {
                content: {
                    'application/json': {
                        schema: bodySchema
                    }
                }
            }
        },
        responses: {
            default: {
                description: 'Invalid request',
                content: {}
            },
            200: {
                description: 'Successful response',
                content: {
                    'application/json': {
                        schema: resultSchema
                    }
                }
            }
        }
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
            result = document;
    }

    await swaggerParser.validate(result);
    const dereferenced = await swaggerParser.dereference(result);
    let getBasePath;
    if (dereferenced.swagger) {
        if (!dereferenced.securityDefinitions || !Object.keys(dereferenced.securityDefinitions).length) throw errors['bus.securityDefinitions']();
        getBasePath = () => result.basePath;
    } else if (dereferenced.openapi) {
        if (!dereferenced.components?.securitySchemes || !Object.keys(dereferenced.components.securitySchemes).length) throw errors['bus.securitySchemes']();
        getBasePath = schema => {
            const docUrl = result.servers?.[0]?.url;
            const schemaUrl = schema.servers?.[0]?.url;
            return schemaUrl
                ? schemaUrl.startsWith('/') && schemaUrl
                : docUrl?.startsWith('/') && docUrl;
        };
    }

    Object.entries(result.paths).forEach(([path, methods]) => !path.startsWith('x-') &&
        Object.entries(methods).forEach(([method, schema]) => {
            if (method.startsWith('x-')) return;
            const {operationId, responses} = schema;
            if (!operationId) throw new Error('operationId must be defined');
            const successCodes = Object.keys(responses).map(x => +x).filter(code => code >= 200 && code < 300);
            if (successCodes.length !== 1) throw new Error('Exactly one successful HTTP status code must be defined');
            const [namespace] = operationId.split('.');
            if (!swaggerRoutes[namespace]) swaggerRoutes[namespace] = [];
            const basePath = getBasePath(schema);
            swaggerRoutes[namespace].push({
                document: dereferenced,
                method,
                schema,
                basePath,
                path: [basePath, path].filter(Boolean).join(''),
                operationId,
                successCode: successCodes[0],
                receive: schema['x-ut-receive'] || methods['x-ut-receive'] || result.paths['x-ut-receive'],
                errorTransform: schema['x-ut-errorTransform'] || methods['x-ut-errorTransform'] || result.paths['x-ut-errorTransform'],
                authorize: schema['x-ut-authorize'] || methods['x-ut-authorize'] || result.paths['x-ut-authorize']
            });
        })
    );
    return result;
}

const authStrategy = (securityItems, {securityDefinitions = {}, swagger, openapi, components: {securitySchemes = {}} = {}}) => {
    if (!securityItems?.length) return false;
    const mapper = {
        2: security => [
            'swagger',
            securityDefinitions[Object.keys(security)[0]].type,
            securityDefinitions[Object.keys(security)[0]]['x-scheme']
        ].filter(Boolean).join('.'),
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

module.exports = async(config = {}, errors, issuers, internal, forward = () => undefined, checkAuth) => {
    const swaggerRoutes = {};
    const pending = [];
    const documents = {};

    function registerOpenApi(map) {
        for (const [name, document] of Object.entries(map)) {
            const doc = registerOpenApiAsync(
                document,
                swaggerRoutes,
                errors
            );
            documents[name] = {doc};
            pending.push(doc);
        }
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

    async function apidoc(auth, namespace, standard = 'swagger') {
        await Promise.all(pending);
        if (namespace) {
            const {map, info, doc} = documents[namespace] || {};
            if (doc) {
                const content = await doc;
                return content[standard] && content;
            };
            if (map) {
                const result = {
                    ...(standard === 'swagger') ? {
                        swagger: '2.0'
                    } : {
                        openapi: '3.0.0'
                    },
                    info,
                    paths: {}
                };
                for (const mod of map.values()) {
                    for (const [name, value] of Object.entries(mod)) {
                        const [method, path] = name.split(' ', 2);
                        const permissions = auth?.credentials?.permissionMap;
                        if (permissions && !await checkAuth(value.operationId, permissions, true)) continue;
                        if (!result.paths[path]) result.paths[path] = {};
                        result.paths[path][method.toLowerCase()] = formatPath(standard, value);
                    };
                }
                return result;
            }
        } else {
            return Promise.all(Object.entries(documents).map(async([name, {info, doc}]) => {
                if (info) return [name, {info, swagger: true, openapi: true}];
                const content = await doc;
                return [name, {info: content.info, swagger: !!content.swagger, openapi: !!content.openapi}];
            }));
        }
    };

    const uiRoutes = (config.doc !== false) && require('./ui')({
        service: config.service,
        version: config.version,
        ...config.ui,
        auth: config.auth,
        apidoc,
        issuers,
        internal
    }).routes;
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
                        info: {
                            title: namespace,
                            description: 'UT Microservice API',
                            version
                        },
                        map: new Map()
                    };
                }
                const document = documents[namespace];
                register(document.map, moduleName, httpMethod, path, {
                    tags: [moduleName ? `rpc/${method.split('.')[0]} (${moduleName})` : `rpc/${method.split('.')[0]}`],
                    summary: description,
                    description: [].concat(notes).join('\n'),
                    operationId: method,
                    bodySchema,
                    resultSchema: !resultSchema ? {
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
                basePath,
                path,
                schema,
                operationId,
                successCode,
                receive,
                errorTransform,
                authorize
            }) => {
                const validate = methodValidator(document, path, method, basePath);
                const transform = async(request, error, statusCode) => {
                    let result;
                    if (errorTransform) {
                        const [payload] = await fn.call(
                            object,
                            {...error},
                            {
                                mtid: 'request',
                                method: errorTransform,
                                opcode: operationId,
                                forward: forward(request.headers),
                                auth: request.auth
                            }
                        );
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
                const receiveRequest = async request => {
                    if (!receive) return [request];
                    try {
                        return await fn.call(
                            object,
                            {
                                path: request.path,
                                params: request.params,
                                query: request.query,
                                payload: request.payload,
                                headers: request.headers,
                                auth: request.auth
                            },
                            {
                                mtid: 'request',
                                method: receive,
                                opcode: operationId,
                                forward: forward(request.headers),
                                auth: request.auth
                            }
                        );
                    } catch (error) {
                        throw await transform(request, error, error.statusCode);
                    }
                };

                return {
                    method,
                    path: path && path.split('?')[0],
                    options: {
                        auth: authStrategy(schema.security || document.security, document),
                        ...schema['x-options'],
                        ...authorize && checkAuth && {
                            pre: [
                                {
                                    assign: 'utAuth',
                                    failAction(req, h, error) {
                                        return h.response(error.message).code(403).takeover(); // Forbidden
                                    },
                                    async method(req) {
                                        if (req.auth.strategy) {
                                            await checkAuth(operationId, req.auth.credentials && req.auth.credentials.permissionMap);
                                            return true;
                                        }
                                        return false;
                                    }
                                }
                            ]
                        },
                        handler: async(request, h) => {
                            const [{params, query, payload, headers, auth}] = await receiveRequest(request);
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
                                throw await transform(request, error, 400);
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
                                    forward: forward(headers),
                                    httpRequest: {
                                        url: request.url,
                                        state: request.state,
                                        headers
                                    }
                                });
                            } catch (error) {
                                throw await transform(request, error, error.statusCode);
                            }
                            if (mtid === 'error') {
                                throw await transform(request, body instanceof Error ? body : {}, body?.statusCode);
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
                                throw await transform(request, validationError);
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
