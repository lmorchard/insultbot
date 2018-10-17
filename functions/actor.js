"use strict";

const assign = Object.assign;

const config = require("../lib/config");
const response = require("../lib/response");
const html = require("../lib/html");
const db = require("../lib/db");

module.exports.get = async (event, context) => {
  const {
    log,
    OBJECTS_TABLE: TableName,
    ACTOR_NAME,
    SITE_URL,
    ACTOR_URL,
    PUBLIC_KEY,
  } = await config({
    event,
    context,
  });

  log.info("summary");

  const htmlWithData = async params => {
    return html.actor(
      assign(params, {
        notes: await db.latestNotes({ TableName }),
      })
    );
  };

  const data = {
    "@context": [
      "https://www.w3.org/ns/activitystreams",
      "https://w3id.org/security/v1",
    ],
    type: "Person",
    id: ACTOR_URL,
    url: SITE_URL,
    name: ACTOR_NAME,
    preferredUsername: ACTOR_NAME,
    inbox: `${SITE_URL}/inbox`,
    outbox: `${SITE_URL}/outbox`,
    summary: `<p>
      I am Insultron2000. I am here to serve you. With insults.
      Follow me for automatic service! I belong to
      <a href="https://lmorchard.com">lmorchard</a>
      and you may peer at my innards,
      <a href="https://github.com/lmorchard/insultbot">if you like</a>.
    </p>`.trim(),
    icon: {
      type: "Image",
      mediaType: "image/png",
      url: `${SITE_URL}/static/avatar.png`,
    },
    publicKey: {
      id: `${ACTOR_URL}#main-key`,
      owner: ACTOR_URL,
      publicKeyPem: PUBLIC_KEY,
    },
  };

  return response({
    event,
    headers: { "Cache-Control": "max-age=10" },
    html: htmlWithData,
    jsonType: "application/activity+json",
    data,
  });
};
