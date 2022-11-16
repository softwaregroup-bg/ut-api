/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`test/apiDoc.test.js TAP rpcRoutes > custom namespace swagger document 1`] = `
Object {
  "info": Object {
    "description": "Parking services",
    "title": "example",
    "version": "1.0.0",
  },
  "paths": Object {
    "/parking/pay": Object {
      "post": Object {
        "consumes": Array [
          "application/json",
        ],
        "description": "Pay parking in a city zone",
        "operationId": "example.parking.pay",
        "parameters": Array [
          Object {
            "in": "body",
            "name": "body",
            "schema": Object {
              "properties": Object {
                "city": Object {
                  "description": "City",
                  "type": "string",
                },
                "zone": Object {
                  "description": "Zone",
                  "type": "string",
                },
              },
              "required": Array [
                "city",
                "zone",
              ],
              "type": "object",
            },
          },
        ],
        "responses": Object {
          "200": Object {
            "description": "Payment details",
            "schema": Object {
              "properties": Object {
                "details": Object {
                  "properties": Object {
                    "amount": Object {
                      "type": "string",
                    },
                    "time": Object {
                      "type": "string",
                    },
                  },
                  "required": Array [
                    "time",
                    "amount",
                  ],
                  "type": "object",
                },
              },
              "required": Array [
                "details",
              ],
              "type": "object",
            },
          },
        },
        "security": Array [],
        "summary": "Parking payment",
        "tags": Array [
          "parking",
        ],
        "x-options": Object {
          "payload": Object {
            "parse": false,
          },
        },
        "x-ut-errorTransform": "example.error.transform",
        "x-ut-receive": "example.request.receive",
      },
    },
  },
  "security": Array [
    Object {
      "jwt": Array [],
    },
  ],
  "securityDefinitions": Object {
    "basicAuth": Object {
      "type": "basic",
    },
    "jwt": Object {
      "in": "header",
      "name": "authorization",
      "type": "apiKey",
    },
  },
  "swagger": "2.0",
}
`

exports[`test/apiDoc.test.js TAP rpcRoutes > custom swagger UI html 1`] = `
<!DOCTYPE html>
    <html lang="en">

    <head>
        <meta charset="UTF-8">
        <title>Swagger UI</title>
        <link
            href="https://fonts.googleapis.com/css?family=Open+Sans:400,700|Source+Code+Pro:300,600|Titillium+Web:400,600,700"
            rel="stylesheet">
        <link rel="stylesheet" type="text/css" href="./swagger/ui/swagger-ui.css">
        <link rel="icon" type="image/png" href="./swagger/ui/favicon-32x32.png" sizes="32x32" />
        <link rel="icon" type="image/png" href="./swagger/ui/favicon-16x16.png" sizes="16x16" />
        <style>
            html {
                box-sizing: border-box;
                overflow: -moz-scrollbars-vertical;
                overflow-y: scroll;
            }

            *,
            *:before,
            *:after {
                box-sizing: inherit;
            }

            body {
                margin: 0;
                background: #fafafa;
            }
        </style>
    </head>

    <body>
        <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
            style="position:absolute;width:0;height:0">
            <defs>
                <symbol viewBox="0 0 20 20" id="unlocked">
                    <path d="M15.8 8H14V5.6C14 2.703 12.665 1 10 1 7.334 1 6 2.703 6 5.6V6h2v-.801C8 3.754 8.797 3 10 3c1.203
              0 2 .754 2 2.199V8H4c-.553 0-1 .646-1 1.199V17c0 .549.428 1.139.951 1.307l1.197.387C5.672 18.861 6.55 19
              7.1 19h5.8c.549 0 1.428-.139 1.951-.307l1.196-.387c.524-.167.953-.757.953-1.306V9.199C17 8.646 16.352 8
              15.8 8z"></path>
                </symbol>
                <symbol viewBox="0 0 20 20" id="locked">
                    <path d="M15.8 8H14V5.6C14 2.703 12.665 1 10 1 7.334 1 6 2.703 6 5.6V8H4c-.553 0-1 .646-1 1.199V17c0 .549.428
          1.139.951 1.307l1.197.387C5.672 18.861 6.55 19 7.1 19h5.8c.549 0 1.428-.139
          1.951-.307l1.196-.387c.524-.167.953-.757.953-1.306V9.199C17 8.646 16.352 8 15.8 8zM12 8H8V5.199C8 3.754 8.797 3
          10 3c1.203 0 2 .754 2 2.199V8z" />
                </symbol>
                <symbol viewBox="0 0 20 20" id="close">
                    <path d="M14.348 14.849c-.469.469-1.229.469-1.697 0L10 11.819l-2.651 3.029c-.469.469-1.229.469-1.697
          0-.469-.469-.469-1.229 0-1.697l2.758-3.15-2.759-3.152c-.469-.469-.469-1.228 0-1.697.469-.469 1.228-.469 1.697
          0L10 8.183l2.651-3.031c.469-.469 1.228-.469 1.697 0 .469.469.469 1.229 0 1.697l-2.758 3.152 2.758
          3.15c.469.469.469 1.229 0 1.698z" />
                </symbol>
                <symbol viewBox="0 0 20 20" id="large-arrow">
                    <path d="M13.25 10L6.109 2.58c-.268-.27-.268-.707 0-.979.268-.27.701-.27.969 0l7.83 7.908c.268.271.268.709 0
          .979l-7.83 7.908c-.268.271-.701.27-.969 0-.268-.269-.268-.707 0-.979L13.25 10z" />
                </symbol>
                <symbol viewBox="0 0 20 20" id="large-arrow-down">
                    <path d="M17.418 6.109c.272-.268.709-.268.979 0s.271.701 0 .969l-7.908 7.83c-.27.268-.707.268-.979
          0l-7.908-7.83c-.27-.268-.27-.701 0-.969.271-.268.709-.268.979 0L10 13.25l7.418-7.141z" />
                </symbol>
                <symbol viewBox="0 0 24 24" id="jump-to">
                    <path d="M19 7v4H5.83l3.58-3.59L8 6l-6 6 6 6 1.41-1.41L5.83 13H21V7z" />
                </symbol>
                <symbol viewBox="0 0 24 24" id="expand">
                    <path d="M10 18h4v-2h-4v2zM3 6v2h18V6H3zm3 7h12v-2H6v2z" />
                </symbol>
            </defs>
        </svg>
        <div id="swagger-ui"></div>
        <script src="./swagger/ui/swagger-ui-bundle.js"> </script>
        <script src="./swagger/ui/swagger-ui-standalone-preset.js"> </script>
        <script>
            window.onload = function () {
                function HideTopbarPlugin() {
                    return {
                        components: {
                            Topbar: function () {
                                return null
                            }
                        }
                    }
                }
                // Build a system
                const ui = SwaggerUIBundle({
                    url: '../document/repository/swagger.json',
                    dom_id: '#swagger-ui',
                    deepLinking: true,
                    presets: [
                        SwaggerUIBundle.presets.apis,
                        SwaggerUIStandalonePreset
                    ],
                    plugins: [
                        SwaggerUIBundle.plugins.DownloadUrl,
                        HideTopbarPlugin
                    ],
                    layout: 'StandaloneLayout',
                    displayOperationId: true,
                    filter: true,
                    operationsSorter: 'alpha',
                    oauth2RedirectUrl: document.location.origin + '/oauth2-redirect.html',
                    validatorUrl: null
                })
                ui.initOAuth({"usePkceWithAuthorizationCodeGrant":true,"clientId":"web"})
                window.ui = ui
            }

        </script>
    </body>

    </html>
`

exports[`test/apiDoc.test.js TAP rpcRoutes > custom swagger document 1`] = `
Object {
  "info": Object {
    "description": "Parking services",
    "title": "example",
    "version": "1.0.0",
  },
  "paths": Object {
    "/parking/pay": Object {
      "post": Object {
        "consumes": Array [
          "application/json",
        ],
        "description": "Pay parking in a city zone",
        "operationId": "example.parking.pay",
        "parameters": Array [
          Object {
            "in": "body",
            "name": "body",
            "schema": Object {
              "properties": Object {
                "city": Object {
                  "description": "City",
                  "type": "string",
                },
                "zone": Object {
                  "description": "Zone",
                  "type": "string",
                },
              },
              "required": Array [
                "city",
                "zone",
              ],
              "type": "object",
            },
          },
        ],
        "responses": Object {
          "200": Object {
            "description": "Payment details",
            "schema": Object {
              "properties": Object {
                "details": Object {
                  "properties": Object {
                    "amount": Object {
                      "type": "string",
                    },
                    "time": Object {
                      "type": "string",
                    },
                  },
                  "required": Array [
                    "time",
                    "amount",
                  ],
                  "type": "object",
                },
              },
              "required": Array [
                "details",
              ],
              "type": "object",
            },
          },
        },
        "security": Array [],
        "summary": "Parking payment",
        "tags": Array [
          "parking",
        ],
        "x-options": Object {
          "payload": Object {
            "parse": false,
          },
        },
        "x-ut-errorTransform": "example.error.transform",
        "x-ut-receive": "example.request.receive",
      },
    },
  },
  "security": Array [
    Object {
      "jwt": Array [],
    },
  ],
  "securityDefinitions": Object {
    "basicAuth": Object {
      "type": "basic",
    },
    "jwt": Object {
      "in": "header",
      "name": "authorization",
      "type": "apiKey",
    },
  },
  "swagger": "2.0",
}
`

exports[`test/apiDoc.test.js TAP rpcRoutes > subject namespace openapi document 1`] = `
Object {
  "components": Object {
    "securitySchemes": Object {
      "ut-login": Object {
        "flows": Object {
          "authorizationCode": Object {
            "authorizationUrl": "http://localhost:8090/rpc/login/form",
            "scopes": Object {
              "api": "API",
            },
            "tokenUrl": "http://localhost:8090/rpc/login/token",
          },
        },
        "type": "oauth2",
      },
    },
  },
  "info": Object {
    "description": "UT Microservice API",
    "title": "subject",
    "version": "1.2.3",
  },
  "openapi": "3.0.0",
  "paths": Object {
    "/rpc/subject/object/xxx": Object {
      "post": Object {
        "description": "subject.object.xxx",
        "operationId": "subject.object.xxx",
        "requestBody": Object {
          "content": Object {
            "application/json": Object {
              "schema": Object {
                "additionalProperties": true,
                "properties": Object {},
                "type": "object",
              },
            },
          },
        },
        "responses": Object {
          "200": Object {
            "content": Object {
              "application/json": Object {
                "schema": Object {
                  "additionalProperties": false,
                  "properties": Object {
                    "id": Object {
                      "description": "Unique identifier of the request",
                      "example": "1",
                      "maxLength": 36,
                      "minLength": 1,
                      "type": "string",
                    },
                    "jsonrpc": Object {
                      "description": "Version of the JSON-RPC protocol",
                      "enum": Array [
                        "2.0",
                      ],
                      "example": "2.0",
                      "type": "string",
                    },
                    "method": Object {
                      "description": "Name of the method",
                      "enum": Array [
                        "subject.object.xxx",
                      ],
                      "example": "subject.object.xxx",
                      "type": "string",
                    },
                    "result": Object {
                      "additionalProperties": true,
                      "properties": Object {},
                      "type": "object",
                    },
                  },
                  "required": Array [
                    "jsonrpc",
                    "method",
                  ],
                  "type": "object",
                },
              },
            },
            "description": "Successful response",
          },
          "default": Object {
            "content": Object {},
            "description": "Invalid request",
          },
        },
        "summary": "method with predicate xxx",
        "tags": Array [
          "subject",
        ],
      },
    },
    "/rpc/subject/object/yyy": Object {
      "post": Object {
        "description": "subject.object.yyy",
        "operationId": "subject.object.yyy",
        "requestBody": Object {
          "content": Object {
            "application/json": Object {
              "schema": Object {
                "additionalProperties": true,
                "properties": Object {},
                "type": "object",
              },
            },
          },
        },
        "responses": Object {
          "200": Object {
            "content": Object {
              "application/json": Object {
                "schema": Object {
                  "additionalProperties": false,
                  "properties": Object {
                    "id": Object {
                      "description": "Unique identifier of the request",
                      "example": "1",
                      "maxLength": 36,
                      "minLength": 1,
                      "type": "string",
                    },
                    "jsonrpc": Object {
                      "description": "Version of the JSON-RPC protocol",
                      "enum": Array [
                        "2.0",
                      ],
                      "example": "2.0",
                      "type": "string",
                    },
                    "method": Object {
                      "description": "Name of the method",
                      "enum": Array [
                        "subject.object.yyy",
                      ],
                      "example": "subject.object.yyy",
                      "type": "string",
                    },
                    "result": Object {
                      "additionalProperties": true,
                      "properties": Object {},
                      "type": "object",
                    },
                  },
                  "required": Array [
                    "jsonrpc",
                    "method",
                  ],
                  "type": "object",
                },
              },
            },
            "description": "Successful response",
          },
          "default": Object {
            "content": Object {},
            "description": "Invalid request",
          },
        },
        "summary": "method with predicate yyy",
        "tags": Array [
          "subject",
        ],
      },
    },
  },
  "security": Array [
    Object {
      "ut-login": Array [
        "api",
      ],
    },
  ],
  "tags": Array [
    Object {
      "description": "utApi.validations",
      "name": "subject",
    },
  ],
}
`

exports[`test/apiDoc.test.js TAP rpcRoutes > subject namespace swagger document 1`] = `
Object {
  "info": Object {
    "description": "UT Microservice API",
    "title": "subject",
    "version": "1.2.3",
  },
  "paths": Object {
    "/rpc/subject/object/xxx": Object {
      "post": Object {
        "description": "subject.object.xxx",
        "operationId": "subject.object.xxx",
        "parameters": Array [
          Object {
            "description": "body",
            "in": "body",
            "name": "body",
            "required": true,
            "schema": Object {
              "additionalProperties": true,
              "properties": Object {},
              "type": "object",
            },
          },
        ],
        "produces": Array [
          "application/json",
        ],
        "responses": Object {
          "200": Object {
            "description": "Successful response",
            "schema": Object {
              "additionalProperties": false,
              "properties": Object {
                "id": Object {
                  "description": "Unique identifier of the request",
                  "example": "1",
                  "maxLength": 36,
                  "minLength": 1,
                  "type": "string",
                },
                "jsonrpc": Object {
                  "description": "Version of the JSON-RPC protocol",
                  "enum": Array [
                    "2.0",
                  ],
                  "example": "2.0",
                  "type": "string",
                },
                "method": Object {
                  "description": "Name of the method",
                  "enum": Array [
                    "subject.object.xxx",
                  ],
                  "example": "subject.object.xxx",
                  "type": "string",
                },
                "result": Object {
                  "additionalProperties": true,
                  "properties": Object {},
                  "type": "object",
                },
              },
              "required": Array [
                "jsonrpc",
                "method",
              ],
              "type": "object",
            },
          },
          "default": Object {
            "description": "Invalid request",
            "schema": Object {},
          },
        },
        "summary": "method with predicate xxx",
        "tags": Array [
          "subject",
        ],
      },
    },
    "/rpc/subject/object/yyy": Object {
      "post": Object {
        "description": "subject.object.yyy",
        "operationId": "subject.object.yyy",
        "parameters": Array [
          Object {
            "description": "body",
            "in": "body",
            "name": "body",
            "required": true,
            "schema": Object {
              "additionalProperties": true,
              "properties": Object {},
              "type": "object",
            },
          },
        ],
        "produces": Array [
          "application/json",
        ],
        "responses": Object {
          "200": Object {
            "description": "Successful response",
            "schema": Object {
              "additionalProperties": false,
              "properties": Object {
                "id": Object {
                  "description": "Unique identifier of the request",
                  "example": "1",
                  "maxLength": 36,
                  "minLength": 1,
                  "type": "string",
                },
                "jsonrpc": Object {
                  "description": "Version of the JSON-RPC protocol",
                  "enum": Array [
                    "2.0",
                  ],
                  "example": "2.0",
                  "type": "string",
                },
                "method": Object {
                  "description": "Name of the method",
                  "enum": Array [
                    "subject.object.yyy",
                  ],
                  "example": "subject.object.yyy",
                  "type": "string",
                },
                "result": Object {
                  "additionalProperties": true,
                  "properties": Object {},
                  "type": "object",
                },
              },
              "required": Array [
                "jsonrpc",
                "method",
              ],
              "type": "object",
            },
          },
          "default": Object {
            "description": "Invalid request",
            "schema": Object {},
          },
        },
        "summary": "method with predicate yyy",
        "tags": Array [
          "subject",
        ],
      },
    },
  },
  "security": Array [
    Object {
      "ut-login": Array [
        "api",
      ],
    },
  ],
  "securityDefinitions": Object {
    "ut-login": Object {
      "authorizationUrl": "http://localhost:8090/rpc/login/form",
      "flow": "accessCode",
      "scopes": Object {
        "api": "API",
      },
      "tokenUrl": "http://localhost:8090/rpc/login/token",
      "type": "oauth2",
    },
  },
  "swagger": "2.0",
  "tags": Array [
    Object {
      "description": "utApi.validations",
      "name": "subject",
    },
  ],
}
`
