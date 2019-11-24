const uiDistPath = require('swagger-ui-dist').getAbsoluteFSPath();
const docsPath = require('path').join(__dirname, 'docs');
const Boom = require('@hapi/boom');
const apiList = require('./api');
const swagger = require('./swagger');

module.exports = ({documents, service = 'server', path = '/api/' + service, initOAuth}) => {
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
            path: '/api',
            options: {
                auth: false,
                handler: (request, h) => h.redirect(path + '/')
            }
        }, {
            method: 'GET',
            path: '/api.json',
            options: {
                auth: false,
                handler: (request, h) => h.response(Object.entries(documents)
                    .map(([name, {host, info: {title, description, version, 'x-ut-service': service} = {}}]) => ({
                        name, title, description, version, host, service
                    }))).type('application/json')
            }
        }, {
            method: 'GET',
            path,
            options: {
                auth: false,
                handler: (request, h) => h.redirect(path + '/')
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
            path: `${path}/swagger.html`,
            options: {auth: false},
            handler: (request, h) => h.response(swagger(initOAuth)).type('text/html')
        }, {
            method: 'GET',
            path: `${path}/{page*}`,
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
            path: `${path}/ui/{page*}`,
            options: {auth: false},
            handler: {
                directory: {
                    path: uiDistPath,
                    index: false
                }
            }
        }]
    };
};
