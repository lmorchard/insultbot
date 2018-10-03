const response = (module.exports = {});

response.base = ({ statusCode = 200, type = "application/json", body }) => ({
  statusCode,
  headers: { "Content-Type": type },
  body,
});

response.json = ({ statusCode, type = "application/json", data = {} }) =>
  response.base({
    statusCode,
    type,
    body: JSON.stringify(data),
  });

response.html = ({ statusCode, type = "text/html", body }) =>
  response.base({
    statusCode,
    type,
    body,
  });

response.badRequest = ({ data }) => response.json({ statusCode: 400, data });

response.forbidden = ({ data }) => response.json({ statusCode: 401, data });

response.notFound = ({ body = "Not found" }) =>
  response.base({
    statusCode: 404,
    type: "text/plain",
    body,
  });
