const AWS = require("aws-sdk");
AWS.config.update({ region: "us-east-1" });

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
    .get("/", async ctx => lambdaFn(ctx, "index", "get"))
    .get("/.well-known/webfinger", async ctx =>
      lambdaFn(ctx, "webfinger", "get")
    )
    .get("/actor", async ctx => lambdaFn(ctx, "actor", "get"))
    .get("/objects/:uuid", async ctx => lambdaFn(ctx, "objects", "get"))
    .post("/inbox", async ctx => lambdaFn(ctx, "inbox", "post"))
    .get("/outbox", async ctx => lambdaFn(ctx, "outbox", "get"));

  app.use(router.routes()).use(router.allowedMethods());

  console.log(`Server up on port ${PORT}`);
  app.listen(PORT);
}

async function lambdaFn(ctx, moduleName, fnName) {
  const { request, response } = ctx;
  const {
    statusCode: status,
    headers,
    body,
  } = await require(`../functions/${moduleName}`)[fnName](
    {
      method: request.method,
      path: request.url,
      pathParameters: ctx.params,
      headers: request.headers,
      queryStringParameters: request.query,
    },
    {
      awsRequestId: "" + Date.now() + Math.random(),
      functionName: `${moduleName}-${fnName}`,
      functionVersion: "$LATEST",
    }
  );
  response.status = status;
  response.set(headers);
  response.body = body;
}

init();
