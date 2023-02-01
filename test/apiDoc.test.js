const tap = require('tap');
const joi = require('joi');
const got = require('got');
const hapi = require('@hapi/hapi');
const inert = require('inert');
const custom = require('./swagger');

tap.test('rpcRoutes', async assert => {
    const utApi = require('..');
    const {rpcRoutes, registerOpenApi, uiRoutes} = await utApi(
        {service: 'test', version: '1.2.3', ui: {auth: false}}, // config
        {}, // errors
        () => ([{
            issuer: 'ut-login',
            id_token_signing_alg_values_supported: [
                'RS256'
            ],
            code_challenge_methods_supported: [
                'S256'
            ],
            authorization_endpoint: 'http://localhost:8090/rpc/login/form',
            token_endpoint: 'http://localhost:8090/rpc/login/token',
            jwks_uri: 'http://localhost:8090/rpc/login/jwks'
        }]) // issuers
    );
    rpcRoutes([{
        description: 'method with predicate xxx',
        method: 'subject.object.xxx',
        version: '1.2.3',
        validate: {
            payload: joi.object()
        },
        result: joi.object()
    }, {
        description: 'method with predicate yyy',
        method: 'subject.object.yyy',
        version: '1.2.3',
        validate: {
            payload: joi.object()
        },
        result: joi.object()
    }], 'utApi.validations');

    registerOpenApi({custom});

    const server = hapi.server({
        routes: {
            files: {
                relativeTo: __dirname
            }
        }

    });
    await server.register(inert);
    server.route([...uiRoutes, {
        method: 'GET',
        path: '/aa/document/repository/swagger.json',
        handler: (request, h) => h.file('swagger.json')
    }]);
    await server.start();
    try {
        const {api: modules} = await got(`${server.info.uri}/aa/api.json`).json();
        const baseUrl = `${server.info.uri}/aa/api`;
        const customSwaggerUrl = '../document/repository/swagger.json';
        const customSwaggerDoc = await got(new URL(customSwaggerUrl, `${baseUrl}/swagger.html`)).json();
        assert.matchSnapshot(customSwaggerDoc, 'custom swagger document');
        const customSwaggerUi = await got(`${baseUrl}/swagger.html?url=${customSwaggerUrl}`);
        assert.matchSnapshot(customSwaggerUi.body, 'custom swagger UI html');
        for (const {namespace, swagger, openapi} of modules) {
            if (swagger) {
                const swaggerDoc = await got(`${baseUrl}/${namespace}/swagger.json`).json();
                assert.matchSnapshot(swaggerDoc, `${namespace} namespace swagger document`);
            }
            if (openapi) {
                const openapiDoc = await got(`${baseUrl}/${namespace}/openapi.json`).json();
                delete openapiDoc.servers;
                assert.matchSnapshot(openapiDoc, `${namespace} namespace openapi document`);
            }
            const customDoc = await got(new URL(`../${customSwaggerUrl}`, `${baseUrl}/${namespace}/swagger.html`)).json();
            assert.strictSame(customDoc, customSwaggerDoc, `${namespace} namespace custom swagger document`);
            const customHtml = await got(`${baseUrl}/${namespace}/swagger.html?url=../${customSwaggerUrl}`);
            assert.equal(customHtml.statusCode, 200, `${namespace} namespace custom swagger ui`);
        }
    } finally {
        await server.stop();
    }
});
