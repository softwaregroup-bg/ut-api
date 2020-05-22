const path = require('path');
const swaggerValidator = require('ut-swagger2-validator');
const swaggerParser = require('swagger-parser');
const joiToJsonSchema = require('joi-to-json-schema');
const Boom = require('@hapi/boom');
const convertJoi = joiSchema => joiToJsonSchema(joiSchema, (schema, j) => {
    if (schema.type === 'array' && !schema.items) schema.items = {};

    if (j._examples && j._examples.length > 0) {
        schema.examples = j._examples;
    }

    if (j._examples && j._examples.length === 1) {
        schema.example = j._examples[0];
    }

    return schema;
});

const emptyDoc = (namespace = 'custom', version = '0.0.1') => ({
    swagger: '2.0',
    info: {
        title: namespace,
        description: 'Internal microservice API',
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

module.exports = async(config = {}, errors, issuers) => {
    const swaggerRoutes = {};

    let rest;
    switch (typeof config.document) {
        case 'function':
            rest = config.document();
            break;
        case 'string':
            rest = await swaggerParser.bundle(config.document);
            break;
        default:
            rest = config.document || emptyDoc();
    }

    await swaggerParser.validate(rest);

    const validator = await swaggerValidator(rest);
    const documents = {rest};
    const moduleDoc = {};

    const getRoutePath = path => [rest.basePath, path].filter(Boolean).join('');

    const routesMap = {};
    function register(moduleName, value) {
        if (!routesMap[moduleName]) routesMap[moduleName] = {};
        routesMap[moduleName][`${value.method.toUpperCase()} ${value.path}`] = value;
    }
    function unregister(moduleName, method, path) {
        if (!routesMap[moduleName]) return;
        if (!method && !path) {
            delete routesMap[moduleName];
        } else {
            delete routesMap[moduleName][`${method.toUpperCase()} ${path}`];
        }
    }

    Object.entries(rest.paths).forEach(([path, methods]) => {
        Object.entries(methods).forEach(([method, schema]) => {
            const {operationId, responses} = schema;
            if (!operationId) throw new Error('operationId must be defined');
            const successCodes = Object.keys(responses).map(x => +x).filter(code => code >= 200 && code < 300);
            if (successCodes.length !== 1) throw new Error('Exactly one successful HTTP status code must be defined');
            const [namespace] = operationId.split('.');
            if (!swaggerRoutes[namespace]) swaggerRoutes[namespace] = [];
            swaggerRoutes[namespace].push({
                method,
                path: getRoutePath(path),
                operationId,
                successCode: successCodes[0]
            });
        });
    });

    const uiRoutes = config.ui && require('./ui')({service: config.service, ...config.ui, documents, issuers}).routes;
    if (uiRoutes) uiRoutes.forEach(route => register('utApi', route));

    return {
        apiCss: path.join(__dirname, 'docs', 'api.css'),
        apiList: require('./api'),
        uiRoutes,
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
                security
            }) => {
                if (!description) description = method;
                if (!notes) notes = method;
                const bodySchema = (validate && validate.payload && convertJoi(validate.payload)) ||
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
                        ...params && {params: params.isJoi ? convertJoi(params) : params}
                    }
                };
                const resultSchema = (result && result.isJoi) ? convertJoi(result) : result;
                const namespace = method.split('.')[0];
                if (!documents[namespace]) documents[namespace] = emptyDoc(namespace, version);
                if (moduleName && !moduleDoc[moduleName]) moduleDoc[moduleName] = [];
                const document = documents[namespace];
                if (!document.paths[path]) document.paths[path] = {};
                if (moduleName) moduleDoc[moduleName].push([httpMethod.toLowerCase(), path, document.paths]);
                document.paths[path][httpMethod.toLowerCase()] = {
                    tags: ['rpc/' + method.split('.')[0]],
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
                };
                return {
                    method: httpMethod,
                    path: getRoutePath(path),
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
                        security
                    }
                };
            });
            if (moduleName) result.forEach(route => register(moduleName, route));
            return result;
        },
        restRoutes({namespace, fn, object}) {
            if (!swaggerRoutes[namespace]) return [];
            const result = swaggerRoutes[namespace].map(({
                method,
                path,
                operationId,
                successCode
            }) => {
                const validate = validator[operationId];
                const $meta = {mtid: 'request', method: operationId};
                return {
                    method,
                    path,
                    options: {
                        auth: false,
                        handler: async(request, h) => {
                            const {params, query, payload, headers} = request;

                            const validation = await validate.request({
                                query,
                                body: payload,
                                headers,
                                pathParameters: params
                            });
                            if (validation.length > 0) {
                                throw Boom.boomify(errors['bus.requestValidation']({
                                    validation,
                                    params: {
                                        method: operationId
                                    }
                                }), {
                                    statusCode: 400
                                });
                            }

                            const msg = {
                                ...(Array.isArray(payload) ? {list: payload} : payload),
                                ...params,
                                ...query
                            };

                            let body, mtid;
                            try {
                                [body, {mtid}] = await fn.call(object, msg, $meta);
                            } catch (e) {
                                return h
                                    .response({
                                        type: e.type,
                                        message: e.message,
                                        ...e
                                    })
                                    .header('x-envoy-decorator-operation', operationId)
                                    .code(e.statusCode || 500);
                            }
                            if (mtid === 'error') {
                                const error = Boom.boomify(body instanceof Error ? body : {}, {statusCode: (body && body.statusCode) || 500});
                                error.output.headers['x-envoy-decorator-operation'] = operationId;
                                throw error;
                            }
                            const responseValidation = await validate.response({status: successCode, body});
                            if (responseValidation.length > 0) {
                                const error = Boom.boomify(errors['bus.responseValidation']({
                                    validation: responseValidation,
                                    params: {
                                        method: operationId
                                    }
                                }), {
                                    statusCode: 500
                                });
                                error.output.headers['x-envoy-decorator-operation'] = operationId;
                                throw error;
                            }
                            return h
                                .response(body)
                                .header('x-envoy-decorator-operation', operationId)
                                .code(successCode);
                        }
                    }
                };
            });
            result.forEach(route => register(namespace, route));
            return result;
        },
        route(routes) {
            [].concat(routes).forEach(route => register('utApi', route));
        },
        deleteRoute({namespace, method, path}) {
            unregister(namespace, method, path);
            if (Array.isArray(moduleDoc[namespace])) {
                moduleDoc[namespace].forEach(([key, path, paths]) => {
                    delete paths[path][key];
                    if (!Object.keys(paths[path]).length) delete paths[path];
                });
                delete moduleDoc[namespace];
            }
        },
        routes() {
            return [].concat(...Object.values(routesMap).map(routes => Object.values(routes)));
        }
    };
};
