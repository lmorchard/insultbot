const log = require("./log");

const { readTextFile } = require("./utils");

const {
  LOG_LEVEL = "debug",
  HOSTNAME = "insultron.lmorchard.com",
  ACTOR_NAME = "Insultron2000",
  QUEUE_NAME,
  STATIC_BUCKET,
} = process.env;

module.exports = async (params = {}) => {
  const { event = {}, context = {}, meta = {} } = params;
  const SITE_URL = `https://${HOSTNAME}`;
  const ACTOR_URL = `${SITE_URL}/actor.json`;
  const ACTOR_KEY_URL = `${ACTOR_URL}#main-key`;
  return {
    log: log({ event, context, meta, LOG_LEVEL }),
    PUBLIC_KEY: process.env.PUBLIC_KEY || (await readTextFile("public.pem")),
    PRIVATE_KEY: process.env.PRIVATE_KEY || (await readTextFile("private.pem")),
    LOG_LEVEL,
    HOSTNAME,
    ACTOR_NAME,
    QUEUE_NAME,
    STATIC_BUCKET,
    SITE_URL,
    ACTOR_URL,
    ACTOR_KEY_URL,
  };
};
