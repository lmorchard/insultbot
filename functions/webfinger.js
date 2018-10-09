"use strict";

const config = require("../lib/config");
const response = require("../lib/response");
const html = require("../lib/html");

module.exports.get = async (event, context) => {
  const { log, ACTOR_NAME, HOSTNAME, ACTOR_URL } = await config({
    event,
    context,
  });

  const expectedAcct = `acct:${ACTOR_NAME}@${HOSTNAME}`;

  const { queryStringParameters = {} } = event;
  const { resource } = queryStringParameters;

  if (resource !== expectedAcct) {
    log.warning("notfound", { resource, expectedAcct });
    return response.notFound({ event });
  }

  log.info("found", { resource });
  return response({
    event,
    headers: { "Cache-Control": "max-age=31536000, immutable" },
    jsonType: "application/jrd+json",
    html: html.webfinger,
    data: {
      subject: expectedAcct,
      links: [
        {
          rel: "self",
          type: "application/activity+json",
          href: ACTOR_URL,
        },
      ],
    },
  });
};
