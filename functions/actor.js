"use strict";

const config = require("../lib/config");
const response = require("../lib/response");

module.exports.get = async (event, context) => {
  const { log, ACTOR_NAME, SITE_URL, ACTOR_URL, PUBLIC_KEY } = await config({
    event,
    context,
  });

  log.info("summary");

  return response.json({
    type: "application/activity+json",
    data: {
      "@context": [
        "https://www.w3.org/ns/activitystreams",
        "https://w3id.org/security/v1",
      ],
      type: "Person",
      id: ACTOR_URL,
      name: ACTOR_NAME,
      preferredUsername: ACTOR_NAME,
      inbox: `${SITE_URL}/inbox`,
      outbox: `${SITE_URL}/outbox`,
      summary: `<p>
        I am Insultron2000. I am here to serve you. With insults.
        Follow me for automatic service!
      </p>`.trim(),
      icon: {
        type: "Image",
        mediaType: "image/png",
        url: "https://lmorchard.com/images/goblin.PNG",
      },
      publicKey: {
        id: `${ACTOR_URL}#main-key`,
        owner: ACTOR_URL,
        publicKeyPem: PUBLIC_KEY,
      },
    },
  });
};
