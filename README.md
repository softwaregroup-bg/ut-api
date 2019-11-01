# ut-api

API generation tools for [hapi](https://hapi.dev/)

## API

Exposes a single initialization method:

`async init(config, errors)` - initializes the module

- `config` - configuration object with the following properties:
  - `ui` - boolean, activates generation of UI for the API
  - `document` - define custom endpoints based on Swagger 2.0 or
    OpenAPI 3.0 document. Possible values are:
    - `function` - the function is called and it must return parsed API document
    - `string` - the string is parsed to create the API document
    - `object` - must be valid API document
    - anything else will generate empty API document
- `result` - the function returns object with the following properties:
  - `uiRoutes` - object containing hapi routes that handle the API ui
  - `rpcRoutes` - function, used to define RPC routes based on JOI validations
  - `restRoutes` - function, used to define attach handler for REST routes,
  based on the passed `config.document`

The functions in the result have the following signatures:

- `function rpcRoutes(definitions)`
  - `definitions` - array of objects with the following properties, used to
  describe each method:
    - `tags` - method tags
    - `app` - custom method properties
    - `timeout` - handler default timeout
    - `method` - method name
    - `description` - short method description
    - `notes` - long method description
    - `params` - joi validation of method params
    - `result` - joi validation of method result
    - `validate` - hapi route validate options
    - `handler` - hapi route handler
  - `result` - object containing hapi routes that handle the generated
  RPC routes
- `function restRoutesApi({namespace, fn, object})`
  - `namespace` - namespace of the handler function
  - `fn` - handler function
  - `object` - handler function binding for `this`
  - `result` - object containing hapi routes that handle the generated
  REST routes
