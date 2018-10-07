const accepts = require("accepts");
const html = require("./html");
const assign = Object.assign;

const response = (module.exports = async ({
  event,
  headers = {},
  statusCode = 200,
  data = {},
  html = data => html.base({ body: data }),
  htmlType = "text/html",
  json = data => JSON.stringify(data, null, " "),
  jsonType = "application/json",
}) => {
  const accept = accepts({ headers: lcHeaders(event) });
  const response = async (type, body) => ({
    statusCode,
    headers: assign({ "Content-Type": type }, headers),
    body: await body(data),
  });
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
        html: () => html.base({ body: `Accepted` }),
      },
      params
    )
  );

response.badRequest = params =>
  response(
    assign(
      {
        statusCode: 400,
        html: ({ error }) => html.base({ body: `Bad request: ${error}` }),
      },
      params
    )
  );

response.forbidden = params =>
  response(
    assign(
      {
        statusCode: 401,
        html: ({ error }) => html.base({ body: `Forbidden: ${error}` }),
      },
      params
    )
  );

response.notFound = params =>
  response(
    assign(
      {
        statusCode: 404,
        html: () => html.base({ body: `Not Found` }),
      },
      params
    )
  );
