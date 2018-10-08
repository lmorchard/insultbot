const accepts = require("accepts");
const htmlBase = require("./html");
const assign = Object.assign;

const defaultHtml = data => htmlBase({ body: data });

const defaultJson = data => JSON.stringify(data, null, " ");

const response = (module.exports = async ({
  event,
  headers = {},
  statusCode = 200,
  data = {},
  html = defaultHtml,
  htmlType = "text/html",
  json = defaultJson,
  jsonType = "application/json",
}) => {
  const accept = accepts({ headers: lcHeaders(event) });
  const response = async (type, body) => ({
    statusCode,
    headers: assign({ "Content-Type": type }, headers),
    body: await body(data),
  });
  const { queryStringParameters = {} } = event;
  if (queryStringParameters.json) {
    return response(jsonType, json);
  }
  switch (accept.type(["json", "html"])) {
    case "html":
      return response(htmlType, html);
    default:
      return response(jsonType, json);
  }
});

const lcHeaders = ({ headers }) =>
  Object.entries(headers).reduce(
    (a, [k, v]) => assign({}, a, { [k.toLowerCase()]: v }),
    {}
  );

response.accepted = params =>
  response(
    assign(
      {
        statusCode: 202,
        html: () => htmlBase({ body: `Accepted` }),
      },
      params
    )
  );

response.badRequest = params =>
  response(
    assign(
      {
        statusCode: 400,
        html: ({ error }) => htmlBase({ body: `Bad request: ${error}` }),
      },
      params
    )
  );

response.forbidden = params =>
  response(
    assign(
      {
        statusCode: 401,
        html: ({ error }) => htmlBase({ body: `Forbidden: ${error}` }),
      },
      params
    )
  );

response.notFound = params =>
  response(
    assign(
      {
        statusCode: 404,
        html: () => htmlBase({ body: `Not Found` }),
      },
      params
    )
  );
