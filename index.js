const swaggerValidator = require('ut-swagger2-validator');
const swaggerParser = require('swagger-parser');
const joiToJsonSchema = require('joi-to-json-schema');
const Boom = require('@hapi/boom');
const convertJoi = joiSchema => joiToJsonSchema(joiSchema, (schema, j) => {
    if (schema.type === 'array' && !schema.items) schema.items = {};
    return schema;
});

const emptyDoc = (oidc, namespace = 'custom', version = '0.0.1') => ({
    swagger: '2.0',
    info: {
        title: namespace,
        description: 'Internal microservice API',
        version
    },
    security: oidc.map(({issuer}) => ({[issuer]: ['email']})),
    securityDefinitions: oidc.reduce((prev, cur) => ({
        ...prev,
        [cur.issuer]: {
            type: 'oauth2',
            flow: 'accessCode',
            authorizationUrl: cur.authorization_endpoint,
            tokenUrl: cur.token_endpoint,
            'x-tokenName': 'id_token',
            scopes: {email: 'email'}
        }
    }), {}),
    paths: {}
});

module.exports = async(config, errors) => {
    const routes = {};
    const oidc = await Promise.all(Object.values(config.oidc));

    let rest;
    switch (typeof config.document) {
        case 'function':
            rest = config.document();
            break;
        case 'string':
            rest = await swaggerParser.bundle(config.document);
            break;
        default:
            rest = config.document || emptyDoc(oidc);
    }

    await swaggerParser.validate(rest);

    const validator = await swaggerValidator(rest);
    const documents = {rest};

    const getRoutePath = path => [rest.basePath, path].filter(x => x).join('');

    Object.entries(rest.paths).forEach(([path, methods]) => {
        Object.entries(methods).forEach(([method, schema]) => {
            const {operationId, responses} = schema;
            if (!operationId) throw new Error('operationId must be defined');
            const successCodes = Object.keys(responses).map(x => +x).filter(code => code >= 200 && code < 300);
            if (successCodes.length !== 1) throw new Error('Exactly 1 successful HTTP status code must be defined');
            const [namespace] = operationId.split('.');
            if (!routes[namespace]) routes[namespace] = [];
            routes[namespace].push({
                method,
                path: getRoutePath(path),
                operationId,
                successCode: successCodes[0]
            });
        });
    });

    return {
        uiRoutes: config.ui && require('./ui')({service: config.service, ...config.ui, documents}).routes,
        rpcRoutes: function rpcRoutesApi(definitions) {
            return definitions.map(({
                tags,
                app,
                timeout,
                method,
                description = method,
                notes,
                params,
                result,
                validate,
                handler,
                version
            }) => {
                const paramsSchema = (params && params.isJoi) ? convertJoi(params) : params;
                const resultSchema = (result && result.isJoi) ? convertJoi(result) : result;
                const path = '/rpc/' + method.replace(/\./g, '/');
                const namespace = method.split('.').shift();
                if (!documents[namespace]) documents[namespace] = emptyDoc(oidc, namespace, version);
                const document = documents[namespace];
                document.paths[path] = {
                    post: {
                        tags: ['rpc/' + method.split('.').shift()],
                        summary: description,
                        description: notes && [].concat(notes).join('\n'),
                        operationId: method,
                        parameters: [{
                            name: 'body',
                            in: 'body',
                            description: 'body',
                            required: true,
                            schema: {
                                type: 'object',
                                additionalProperties: false,
                                required: ['id', 'jsonrpc', 'method', 'params'],
                                properties: {
                                    id: {
                                        schema: {
                                            oneOf: [
                                                {type: 'string'},
                                                {type: 'number'}
                                            ]
                                        },
                                        example: '1'
                                    },
                                    timeout: {
                                        type: 'number',
                                        example: null,
                                        nullable: true
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
                                    },
                                    ...paramsSchema && {params: paramsSchema}
                                }
                            }
                        }],
                        responses: {
                            default: {
                                description: 'Invalid request',
                                schema: {}
                            },
                            200: {
                                description: 'Successful response',
                                schema: {
                                    type: 'object',
                                    additionalProperties: false,
                                    required: ['id', 'jsonrpc', 'method'],
                                    properties: {
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
                                        },
                                        ...resultSchema && {result: resultSchema}
                                    }
                                }
                            }
                        }
                    }
                };
                return {
                    method: 'POST',
                    path: getRoutePath(path),
                    options: {
                        auth: config.auth || false,
                        app,
                        timeout,
                        description,
                        notes,
                        tags,
                        validate,
                        handler
                    }
                };
            });
        },
        restRoutes: function restRoutesApi({namespace, fn, object}) {
            if (!routes[namespace]) return [];
            return routes[namespace].map(({
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
                            if (validation.length > 0) throw Boom.boomify(errors['bus.swagger.requestValidation']({validation}), {statusCode: 400});

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
                                const error = Boom.boomify(errors['bus.swagger.responseValidation']({responseValidation}), {statusCode: 500});
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
        }
    };
};
