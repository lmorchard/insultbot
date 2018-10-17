const AWS = require("aws-sdk");
AWS.config.update({ region: "us-east-1" });

const assign = Object.assign;
const Koa = require("koa");
const Router = require("koa-router");

Object.assign(process.env, {
  LOG_LEVEL: "debug",
  HOSTNAME: "insultron.lmorchard.com",
  ACTOR_NAME: "Insultron2000",
  QUEUE_NAME: "insultbot-dev-messages",
  OBJECTS_TABLE: "insultbot-dev-objects",
  FOLLOWERS_TABLE: "insultbot-dev-followers",
}, process.env);

const { PORT = 4200 } = process.env;

function init() {
  const app = new Koa();
  const router = new Router();

  router
    .get("/", lambdaFn("index", "get"))
    .get("/.well-known/webfinger", lambdaFn("webfinger", "get"))
    .get("/actor", lambdaFn("actor", "get"))
    .post("/inbox", lambdaFn("inbox", "post"))
    .get("/outbox", lambdaFn("outbox", "get"));

  app.use(router.routes()).use(router.allowedMethods());

  console.log(`Server up on port ${PORT}`);
  app.listen(PORT);
}

const lambdaFn = (moduleName, fnName) => async ({ request, response }) => {
  const {
    statusCode: status,
    headers,
    body,
  } = await require(`./functions/${moduleName}`)[fnName](
    {
      method: request.method,
      path: request.url,
      pathParameters: request.params,
      headers: request.headers,
      queryStringParameters: request.query,
    },
    {
      awsRequestId: "" + Date.now() + Math.random(),
      functionName: `${moduleName}-${fnName}`,
      functionVersion: "$LATEST",
    }
  );
  assign(response, { status, body }).set(headers);
};

init();
