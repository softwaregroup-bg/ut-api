const uiDistPath = require('swagger-ui-dist').getAbsoluteFSPath();
const docsPath = require('path').join(__dirname, 'docs');
const Boom = require('@hapi/boom');
const apiList = require('./api');
const swagger = require('./swagger');
const path = require('path');
const redirect = path.join(uiDistPath, 'oauth2-redirect.html');
const sortKeys = require('sort-keys');

module.exports = ({apidoc, service = 'server', version, base = '/api', path = base + '/' + service, initOAuth, proxy, internal, issuers}) => {
    const securityByHost = {};
    return {
        routes: [{
            method: 'GET',
            path: `${base}/{namespace}/swagger.json`,
            options: {
                app: {logError: true},
                auth: false,
                handler: async({params, headers, url: {protocol}}, h) => {
                    const document = apidoc(params.namespace);
                    const host = (headers['x-forwarded-proto'] || protocol) + '//' + (headers['x-forwarded-host'] || headers.host);
                    let security = securityByHost[host];

                    if (issuers && !security) {
                        const oidc = await issuers(headers, protocol);
                        security = oidc && oidc.length && {
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
                            }), {})
                        };
                        securityByHost[host] = security;
                    }

                    if (document) {
                        return h.response(JSON.stringify(sortKeys({...security, ...document}, {deep: true}), false, 2)).type('application/json');
                    } else {
                        return Boom.notFound();
                    }
                }
            }
        }, internal && {
            method: 'GET',
            path: `${base}/internal/`,
            options: {auth: false, app: {logError: true}},
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
            options: {auth: false, app: {logError: true}},
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
                auth: false,
                app: {logError: true},
                handler: (request, h) => h.response(apidoc()
                    .map(([namespace, {host, info: {title, description, version} = {}}]) => ({
                        namespace, title, description, version, host
                    }))).type('application/json')
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
                auth: false,
                app: {logError: true},
                handler: (request, h) => h.response(apiList(apidoc(), version)).type('text/html')
            }
        }, {
            method: 'GET',
            path: `${base}/{service}/swagger.html`,
            options: {auth: false, app: {logError: true}},
            handler: (request, h) => h.response(swagger(initOAuth)).type('text/html')
        }, {
            method: 'GET',
            path: `${base}/{service}/{page*}`,
            options: {auth: false, app: {logError: true}},
            handler: {
                directory: {
                    path: docsPath,
                    index: true,
                    defaultExtension: 'html'
                }
            }
        }, {
            method: 'GET',
            path: `${base}/{service}/ui/{page*}`,
            options: {auth: false, app: {logError: true}},
            handler: {
                directory: {
                    path: uiDistPath,
                    index: false
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
