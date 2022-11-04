const uiDistPath = require('swagger-ui-dist').getAbsoluteFSPath();
const docsPath = require('path').join(__dirname, 'docs');
const Boom = require('@hapi/boom');
const apiList = require('./api');
const swagger = require('./swagger');
const path = require('path');
const redirect = path.join(uiDistPath, 'oauth2-redirect.html');
const sortKeys = require('sort-keys');

module.exports = ({apidoc, auth, service = 'server', version, base = '/aa/api', path = base + '/' + service, initOAuth, proxy, internal, issuers}) => {
    const oidcByHost = {};
    async function getOidc(headers, protocol) {
        const host = (headers['x-forwarded-proto'] || protocol) + '//' + (headers['x-forwarded-host'] || headers.host);
        if (issuers && !oidcByHost[host]) {
            try {
                oidcByHost[host] = await issuers(headers, protocol);
            } catch (e) {
                // generate doc without security details
            }
        }
        return oidcByHost[host];
    }
    const formatOpenApi = async({auth: requestAuth, params, headers, url: {protocol}}, h) => {
        const document = await apidoc(requestAuth, params.namespace, 'openapi');
        if (document) {
            const oidc = await getOidc(headers, protocol);
            if (oidc && oidc.length) {
                return h.response(JSON.stringify(sortKeys({
                    security: oidc.map(({issuer}) => ({[issuer]: ['api']})),
                    ...document,
                    components: {
                        securitySchemes: oidc.reduce((prev, cur) => ({
                            ...prev,
                            [cur.issuer]: {
                                type: 'oauth2',
                                flows: {
                                    authorizationCode: {
                                        authorizationUrl: cur.authorization_endpoint,
                                        tokenUrl: cur.token_endpoint,
                                        // 'x-tokenName': 'id_token',
                                        scopes: {api: 'API'}
                                    }
                                }
                            }
                        }), {}),
                        ...document.components
                    }
                }, {deep: true}), false, 2)).type('application/json');
            }
            return h.response(JSON.stringify(sortKeys(document, {deep: true}), false, 2)).type('application/json');
        }
        return Boom.notFound();
    };

    const formatSwagger = async({auth: requestAuth, params, headers, url: {protocol}}, h) => {
        const document = await apidoc(requestAuth, params.namespace, 'swagger');
        if (document) {
            const oidc = await getOidc(headers, protocol);
            if (oidc && oidc.length) {
                return h.response(JSON.stringify(sortKeys({
                    security: oidc.map(({issuer}) => ({[issuer]: ['api']})),
                    securityDefinitions: oidc.reduce((prev, cur) => ({
                        ...prev,
                        [cur.issuer]: {
                            type: 'oauth2',
                            flow: 'accessCode',
                            authorizationUrl: cur.authorization_endpoint,
                            tokenUrl: cur.token_endpoint,
                            // 'x-tokenName': 'id_token',
                            scopes: {api: 'API'}
                        }
                    }), {}),
                    ...document
                }, {deep: true}), (key, value) => {
                    if (value?.oneOf) {
                        const {oneOf, ...rest} = value;
                        return {'x-oneOf': oneOf, ...rest};
                    } else if (key === 'nullable') return undefined;
                    return value;
                }, 2)).type('application/json');
            }
            return h.response(JSON.stringify(sortKeys(document, {deep: true}), false, 2)).type('application/json');
        }
        return Boom.notFound();
    };

    return {
        routes: [{
            method: 'GET',
            path: `${base}/{namespace}/openapi.json`,
            options: {
                app: {logError: true},
                auth,
                handler: formatOpenApi
            }
        }, {
            method: 'GET',
            path: `${base}/{namespace}/swagger.json`,
            options: {
                app: {logError: true},
                auth,
                handler: formatSwagger
            }
        }, {
            method: 'GET',
            path: `${base}/{namespace}/document.json`,
            options: {
                app: {logError: true},
                auth,
                handler: async(request, h) => {
                    const specs = await apidoc(request.auth);
                    const spec = specs.find(([namespace]) => namespace === request.params.namespace);
                    return spec
                        ? spec[1].openapi
                            ? formatOpenApi(request, h)
                            : spec[1].swagger
                                ? formatSwagger(request, h)
                                : Boom.notFound()
                        : Boom.notFound();
                }
            }
        }, internal && {
            method: 'GET',
            path: `${base}/internal/`,
            options: {auth, app: {logError: true}},
            handler: async(request, h) =>
                apiList((await internal()).reduce((prev, service) => [
                    ...prev,
                    [service.namespace, {
                        host: service.hostname && (service.hostname + (service.port ? ':' + service.port : '')),
                        info: {
                            title: service.namespace,
                            description: 'Internal microservice API',
                            version: service.version
                        }
                    }]
                ], []), version)
        }, internal && {
            method: 'GET',
            path: `${base}/internal/{serviceHost}:{servicePort}/{doc*}`,
            options: {auth, app: {logError: true}},
            handler: {
                proxy: {
                    passThrough: true,
                    uri: 'http://{serviceHost}:{servicePort}/{doc}'
                }
            }
        }, base !== '/api' && {
            method: 'GET',
            path: '/api',
            options: {
                auth: false,
                app: {logError: true},
                handler: (request, h) => h.redirect(path + '/')
            }
        }, {
            method: 'GET',
            path: base,
            options: {
                auth: false,
                app: {logError: true},
                handler: (request, h) => h.redirect(path + '/')
            }
        }, {
            method: 'GET',
            path: '/documentation',
            options: {
                auth: false,
                app: {logError: true},
                handler: (request, h) => h.redirect(path + '/')
            }
        }, {
            method: 'GET',
            path: base + '.json',
            options: {
                auth,
                app: {logError: true},
                handler: async(request, h) => h.response({
                    api: (await apidoc(request.auth))
                        .map(([namespace, {host, info: {title, description, version} = {}, swagger, openapi}]) => ({
                            namespace, title, description, version, host, swagger, openapi
                        }))
                }).type('application/json')
            }
        }, {
            method: 'GET',
            path: `${base}/{service}`,
            options: {
                auth: false,
                app: {logError: true},
                handler: (request, h) => h.redirect(request.uri + '/')
            }
        }, {
            method: 'GET',
            path: `${path}/`,
            options: {
                auth,
                app: {logError: true},
                handler: async(request, h) => h.response(apiList(await apidoc(request.auth), version)).type('text/html')
            }
        }, {
            method: 'GET',
            path: `${base}/{service}/swagger.html`,
            options: {auth, app: {logError: true}},
            handler: (request, h) => h.response(swagger(initOAuth, request.params, request.query)).type('text/html')
        }, {
            method: 'GET',
            path: `${base}/swagger.html`,
            options: {auth, app: {logError: true}},
            handler: (request, h) => h.response(swagger(initOAuth, request.params, request.query)).type('text/html')
        }, {
            method: 'GET',
            path: `${base}/swagger/ui/{page*}`,
            options: {auth, app: {logError: true}},
            handler: {
                directory: {
                    path: uiDistPath,
                    index: false
                }
            }
        }, {
            method: 'GET',
            path: `${base}/{service}/{page*}`,
            options: {auth, app: {logError: true}},
            handler: {
                directory: {
                    path: docsPath,
                    index: true,
                    defaultExtension: 'html'
                }
            }
        }, {
            method: 'GET',
            path: '/oauth2-redirect.html',
            options: {auth: false, app: {logError: true}},
            handler: {
                file: {
                    path: redirect,
                    confine: uiDistPath
                }
            }
        }].filter(Boolean)
    };
};
