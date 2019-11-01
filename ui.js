const uiDistPath = require('swagger-ui-dist').getAbsoluteFSPath();
const uiPath = '/docs';
const path = require('path');
const Boom = require('@hapi/boom');
const apiList = require('./api');

module.exports = documents => {
    return {
        routes: [{
            method: 'GET',
            path: `${uiPath}/{document}.json`,
            options: {
                auth: false,
                handler: (request, h) => {
                    const document = documents[request.params.document];
                    return document ? h.response(document).type('application/json') : Boom.notFound();
                }
            }
        }, {
            method: 'GET',
            path: `${uiPath}`,
            options: {
                auth: false,
                handler: (request, h) => h.response(apiList(documents)).type('text/html')
            }
        }, {
            method: 'GET',
            path: `${uiPath}/{page*}`,
            options: {auth: false},
            handler: {
                directory: {
                    path: path.join(__dirname, 'docs'),
                    index: true,
                    defaultExtension: 'html'
                }
            }
        }, {
            method: 'GET',
            path: `${uiPath}/ui/{page*}`,
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
