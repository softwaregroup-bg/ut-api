const uiDistPath = require('swagger-ui-dist').getAbsoluteFSPath();
const docsPath = require('path').join(__dirname, 'docs');
const Boom = require('@hapi/boom');
const apiList = require('./api');
const swagger = require('./swagger');
const path = require('path');
const redirect = path.join(uiDistPath, 'oauth2-redirect.html');
const sortKeys = require('sort-keys');
const crypto = require('crypto');
const got = require('got');

module.exports = ({apidoc, auth, service = 'server', version, base = '/api', path = base + '/' + service, initOAuth, proxy, internal, issuers}) => {
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
                    security: oidc.map(({issuer}) => ({[issuer]: ['email']})),
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
                                        scopes: {email: 'email'}
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
                    security: oidc.map(({issuer}) => ({[issuer]: ['email']})),
                    securityDefinitions: oidc.reduce((prev, cur) => ({
                        ...prev,
                        [cur.issuer]: {
                            type: 'oauth2',
                            flow: 'authorizationCode',
                            authorizationUrl: cur.authorization_endpoint,
                            tokenUrl: cur.token_endpoint,
                            // 'x-tokenName': 'id_token',
                            scopes: {email: 'email'}
                        }
                    }), {}),
                    ...document
                }, {deep: true}), false, 2)).type('application/json');
            }
            return h.response(JSON.stringify(sortKeys(document, {deep: true}), false, 2)).type('application/json');
        }
        return Boom.notFound();
    };

    const cache = {};
    const ext = {
        ...(auth === 'openId') && {
            onPreAuth: {
                async method({query, info, headers, url: {protocol, href}}, h) {
                    if (headers.authorization) return h.continue;
                    const [oidc] = await getOidc(headers, protocol);
                    const remoteAddress = headers['x-real-ip'] || info.remoteAddress;
                    if (!cache[remoteAddress]) cache[remoteAddress] = {};
                    const context = cache[remoteAddress];
                    if (context.verifier) {
                        if (query.code) {
                            const response = await got(oidc.token_endpoint, {
                                method: 'post',
                                form: {
                                    grant_type: 'authorization_code',
                                    code: query.code,
                                    code_verifier: context.verifier,
                                    client_id: 'web',
                                    client_secret: '123',
                                    redirect_uri: href
                                }
                            }).json();
                            context.token = response.access_token;
                        }
                        delete context.verifier;
                    }
                    if (context.token) {
                        headers.authorization = 'Bearer ' + context.token;
                        return h.continue;
                    }
                    context.verifier = crypto.randomBytes(32).toString('base64');
                    const url = new URL(oidc.authorization_endpoint);
                    url.searchParams.set('response_type', 'code');
                    url.searchParams.set('client_id', 'web');
                    url.searchParams.set('redirect_uri', href);
                    url.searchParams.set('scope', 'openid');
                    url.searchParams.set('code_challenge_method', 'S256');
                    url.searchParams.set('code_challenge',
                        crypto
                            .createHash('SHA256')
                            .update(context.verifier)
                            .digest()
                            .toString('base64')
                            .replace(/\+/g, '-')
                            .replace(/\//g, '_')
                            .replace(/=/g, '')
                    );
                    return h.redirect(url).takeover();
                }
            },
            onPostAuth: {
                async method(request, h) {
                    return h.continue;
                }
            }
        }
    };

    return {
        routes: [{
            method: 'GET',
            path: `${base}/{namespace}/openapi.json`,
            options: {
                app: {logError: true},
                auth,
                ext,
                handler: formatOpenApi
            }
        }, {
            method: 'GET',
            path: `${base}/{namespace}/swagger.json`,
            options: {
                app: {logError: true},
                auth,
                ext,
                handler: formatSwagger
            }
        }, {
            method: 'GET',
            path: `${base}/{namespace}/document.json`,
            options: {
                app: {logError: true},
                auth,
                ext,
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
            options: {
                auth,
                ext,
                app: {logError: true}
            },
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
            options: {
                auth,
                ext,
                app: {logError: true}
            },
            handler: {
                proxy: {
                    passThrough: true,
                    uri: 'http://{serviceHost}:{servicePort}/{doc}'
                }
            }
        }, {
            method: 'GET',
            path: base,
            options: {
                auth,
                ext,
                app: {logError: true},
                handler: (request, h) => h.redirect(path + '/')
            }
        }, {
            method: 'GET',
            path: '/documentation',
            options: {
                auth,
                ext,
                app: {logError: true},
                handler: (request, h) => h.redirect(path + '/')
            }
        }, {
            method: 'GET',
            path: base + '.json',
            options: {
                auth,
                ext,
                app: {logError: true},
                handler: async(request, h) => h.response((await apidoc(request.auth))
                    .map(([namespace, {host, info: {title, description, version} = {}, swagger, openapi}]) => ({
                        namespace, title, description, version, host, swagger, openapi
                    }))).type('application/json')
            }
        }, {
            method: 'GET',
            path: `${base}/{service}`,
            options: {
                auth,
                ext,
                app: {logError: true},
                handler: (request, h) => h.redirect(request.uri + '/')
            }
        }, {
            method: 'GET',
            path: `${path}/`,
            options: {
                auth,
                ext,
                app: {logError: true},
                handler: async(request, h) => h.response(apiList(await apidoc(request.auth), version)).type('text/html')
            }
        }, {
            method: 'GET',
            path: `${base}/{service}/swagger.html`,
            options: {
                auth,
                ext,
                app: {logError: true}
            },
            handler: (request, h) => h.response(swagger(initOAuth)).type('text/html')
        }, {
            method: 'GET',
            path: `${base}/swagger/ui/{page*}`,
            options: {
                auth,
                ext,
                app: {logError: true}
            },
            handler: {
                directory: {
                    path: uiDistPath,
                    index: false
                }
            }
        }, {
            method: 'GET',
            path: `${base}/{service}/{page*}`,
            options: {
                auth,
                ext,
                app: {logError: true}
            },
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
            options: {
                auth: false,
                app: {logError: true}
            },
            handler: {
                file: {
                    path: redirect,
                    confine: uiDistPath
                }
            }
        }].filter(Boolean)
    };
};
