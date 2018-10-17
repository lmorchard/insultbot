const log = require("./log");

const { readTextFile } = require("./utils");

const {
  LOG_LEVEL,
  HOSTNAME,
  ACTOR_NAME,
  QUEUE_NAME,
  OBJECTS_TABLE,
  FOLLOWERS_TABLE,
  STATIC_BUCKET,
} = process.env;

module.exports = async ({ event, context, meta }) => {
  const SITE_URL = `https://${HOSTNAME}`;
  const ACTOR_URL = `${SITE_URL}/actor`;
  const ACTOR_KEY_URL = `${ACTOR_URL}#main-key`;
  return {
    log: log({ event, context, meta, LOG_LEVEL }),
    LOG_LEVEL,
    HOSTNAME,
    ACTOR_NAME,
    QUEUE_NAME,
    OBJECTS_TABLE,
    FOLLOWERS_TABLE,
    STATIC_BUCKET,
    SITE_URL,
    ACTOR_URL,
    ACTOR_KEY_URL,
    PUBLIC_KEY: await readTextFile("public.pem"),
    PRIVATE_KEY: await readTextFile("private.pem"),
  };
};
