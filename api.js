const prefix = (host, namespace) => `${host ? `./${host}/api/` : '../'}${namespace ? namespace + '/' : ''}`;
module.exports = (documents, version) => `
<!DOCTYPE html>
<html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width,initial-scale=1">
        <title>API List</title>
        <link rel="stylesheet" type="text/css" href="api.css">
    </head>
    <body>
        <div id="api">
            <div class="apiWrap">
                <h1>API Docs <span>${version}</span></h1>
                <div class="api">${documents.map(([namespace, {host, info: {title, description, version} = {}, swagger, openapi}]) => `
                    <div>
                        <div class="namespace">
                            <div class="title">${title}</div>
                            <div class="tags">
                                <div class="version">${version}</div>
                            </div>
                            <div class="description">${description}</div>
                            <hr />
                            <div class="description">API links</div>
                            ${swagger ? `<div class="link"><a href="${prefix(host, namespace)}swagger.json">Swagger</a></div>` : ''}
                            ${openapi ? `<div class="link"><a href="${prefix(host, namespace)}openapi.json">OpenAPI</a></div>` : ''}
                            <div class="link"><a href="${prefix(host, namespace)}swagger.html">Swagger UI</a></div>
                            <div class="link"><a href="${prefix(host, namespace)}redoc.html">Redoc</a></div>
                        </div>
                    </div>`).join('\r\n')}
                </div>
            </div>
        </div>
    </body>
</html>
`;
