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
                    .map(([name, {host, info: {title, description, version, 'x-ut-service': service} = {}}]) => ({
                        name, title, description, version, host, service
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
        }, proxy && {
            method: 'GET',
            path: `${base}/{service}/{document}.json`,
            options: {auth: false},
            handler: {
                proxy: {
                    passThrough: true,
                    uri: `http://${proxy.prefix || ''}${service}${proxy.suffix || '-service'}:${proxy.port}/{path}`
                }
            }
        }, services && {
            method: 'GET',
            path: `${base}/proxy/`,
            options: {auth: false},
            handler: async(request, h) =>
                apiList((await services()).reduce((prev, service) => ({
                    ...prev,
                    [service.namespace]: {
                        host: service.host && (service.host + (service.port ? ':' + service.port : '')),
                        info: {
                            title: service.namespace,
                            description: 'Internal microservice API',
                            version: service.version,
                            'x-ut-service': service.service
                        }
                    }
                }), {}))
        }].filter(Boolean)
    };
};
