"use strict";

const AWS = require("aws-sdk");
const S3 = new AWS.S3({ apiVersion: "2006-03-01" });

const config = require("../lib/config");
const response = require("../lib/response");
const html = require("../lib/html");

module.exports.get = async (event, context) => {
  const { log, HOSTNAME, STATIC_BUCKET: Bucket } = await config({
    event,
    context,
  });

  const { queryStringParameters = {} } = event;
  const { resource = "" } = queryStringParameters;
  // eslint-disable-next-line no-unused-vars
  const [_, name, host] = resource.split(/[@:]/);

  if (host !== HOSTNAME) {
    log.warning("notfound", { resource });
    return response.notFound({ event });
  }

  let data;
  const Key = `.well-known/webfinger/${name}.json`;
  try {
    const getResult = await S3.getObject({ Bucket, Key }).promise();
    getResult.Body = getResult.Body.toString("utf-8");
    data = JSON.parse(getResult.Body);
    log.debug("getResult", { getResult });
  } catch (error) {
    log.error("getError", { resource, name, host, error: "" + error });
    return response.notFound({ event });
  }

  log.info("found", { resource });
  return response({
    event,
    headers: { "Cache-Control": "max-age=31536000, immutable" },
    jsonType: "application/jrd+json",
    html: html.webfinger,
    data,
  });
};
