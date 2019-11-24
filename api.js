const prefix = (host, service) => `${host ? '//' + host : ''}${service ? '/api/' + service + '/' : ''}`;
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
                <div class="api">${Object.entries(documents).map(([name, {host, info: {title, description, version, 'x-ut-service': service} = {}}]) => `
                    <div>
                        <div class="namespace">
                            <div class="title"/>${title}</div>
                            <div class="tags">
                                <div class="version"/>${version}</div>
                            </div>
                            <div class="description"/>${description}</div>
                            <hr />
                            <div class="description">API links</div>
                            <div class="link"/><a href="${prefix(host, service)}${name}.json">Swagger</a></div>
                            <div class="link"/><a href="${prefix(host, service)}swagger.html?${name}">Swagger UI</a></div>
                            <div class="link"/><a href="${prefix(host, service)}redoc.html?${name}">Redoc</a></div>
                        </div>
                    </div>`).join('\r\n')}
                </div>
            </div>
        </div>
    </body>
</html>
`;
