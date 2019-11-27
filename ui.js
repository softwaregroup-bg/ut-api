const uiDistPath = require('swagger-ui-dist').getAbsoluteFSPath();
const docsPath = require('path').join(__dirname, 'docs');
const Boom = require('@hapi/boom');
const apiList = require('./api');
const swagger = require('./swagger');

module.exports = ({documents, service = 'server', base = '/api', path = base + '/' + service, initOAuth, proxy, services}) => {
    return {
        routes: [{
            method: 'GET',
            path: `${path}/{document}.json`,
            options: {
                auth: false,
                handler: (request, h) => {
                    const document = documents[request.params.document];
                    return document ? h.response(document).type('application/json') : Boom.notFound();
                }
            }
        }, services && {
            method: 'GET',
            path: `${base}/internal/`,
            options: {auth: false},
            handler: async(request, h) =>
                apiList((await services()).reduce((prev, service) => ({
                    ...prev,
                    [service.namespace]: {
                        host: service.host && (service.host + (service.port ? ':' + service.port : '')),
                        info: {
                            title: service.namespace,
                            description: 'Internal microservice API',
                            version: service.version
                        }
                    }
                }), {}))
        }, proxy && {
            method: 'GET',
            path: `${base}/internal/{serviceHost}:{servicePort}/{doc*}`,
            options: {auth: false},
            handler: {
                proxy: {
                    passThrough: true,
                    uri: `http://{serviceHost}:{servicePort}/{doc}`
                }
            }
        }, {
            method: 'GET',
            path: base,
            options: {
                auth: false,
                handler: (request, h) => h.redirect(path + '/')
            }
        }, {
            method: 'GET',
            path: '/documentation',
            options: {
                auth: false,
                handler: (request, h) => h.redirect(path + '/')
            }
        }, {
            method: 'GET',
            path: base + '.json',
            options: {
                auth: false,
                handler: (request, h) => h.response(Object.entries(documents)
                    .map(([namespace, {host, info: {title, description, version} = {}}]) => ({
                        namespace, title, description, version, host
                    }))).type('application/json')
            }
        }, {
            method: 'GET',
            path: `${base}/{service}`,
            options: {
                auth: false,
                handler: (request, h) => h.redirect(request.uri + '/')
            }
        }, {
            method: 'GET',
            path: `${path}/`,
            options: {
                auth: false,
                handler: (request, h) => h.response(apiList(documents)).type('text/html')
            }
        }, {
            method: 'GET',
            path: `${base}/{service}/swagger.html`,
            options: {auth: false},
            handler: (request, h) => h.response(swagger(initOAuth)).type('text/html')
        }, {
            method: 'GET',
            path: `${base}/{service}/{page*}`,
            options: {auth: false},
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
            options: {auth: false},
            handler: {
                directory: {
                    path: uiDistPath,
                    index: false
                }
            }
        }].filter(Boolean)
    };
};
