const prefix = (host, namespace) => `${host ? './' + host : ''}${namespace ? '/api/' + namespace + '/' : ''}`;
module.exports = documents => `
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
                <h1>API Docs</h1>
                <div class="api">${Object.entries(documents).map(([namespace, {host, info: {title, description, version} = {}}]) => `
                    <div>
                        <div class="namespace">
                            <div class="title">${title}</div>
                            <div class="tags">
                                <div class="version">${version}</div>
                            </div>
                            <div class="description">${description}</div>
                            <hr />
                            <div class="description">API links</div>
                            <div class="link"><a href="${prefix(host, namespace)}swagger.json">Swagger</a></div>
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
