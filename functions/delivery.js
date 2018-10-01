"use strict";

const { URL } = require("url");
const fetch = require("node-fetch");

const { signRequest } = require("../lib/httpSignatures");
const { fetchJson } = require("../lib/request");
const setupConfig = require("../lib/config");
const insults = require("../lib/insults");
const { dateNow } = require("../lib/utils");

const ID_PUBLIC = "https://www.w3.org/ns/activitystreams#Public";

exports.handler = async (event, context) => {
  const config = await setupConfig({ event, context });
  const { log } = config;

  await insults.init();

  const results = await Promise.all(
    event.Records.map(record => exports.deliver({ record, context, config }))
  );
  log.info("batchComplete", { count: results.length });
};

exports.deliver = async ({ record, context, config }) => {
  const { log } = config;
  const body = JSON.parse(record.body);

  log.info("deliver", record, body);

  if (body.source === "inbox") {
    return deliverFromInbox({ record, body, context, config });
  }

  return Promise.resolve();
};

async function deliverFromInbox({ record, body, context, config }) {
  const { log, ACTOR_NAME, ACTOR_URL, SITE_URL } = config;
  const actorFrom = await fetchJson(body.activity.actor);
  const inbox = actorFrom.inbox;

  const insult = await insults.generate();
  log.debug("insult", { insult });

  const activity = {
    "@context": [
      "https://www.w3.org/ns/activitystreams",
      "https://w3id.org/security/v1",
    ],
    type: "Create",
    actor: {
      type: "Person",
      id: ACTOR_URL,
      name: ACTOR_NAME,
      preferredUsername: ACTOR_NAME,
      inbox: `${SITE_URL}/inbox`,
      outbox: `${SITE_URL}/outbox`,
    },
    to: [body.activity.actor],
    object: {
      type: "Note",
      published: dateNow(),
      attributedTo: ACTOR_URL,
      to: [body.activity.actor],
      cc: [actorFrom.followers, ID_PUBLIC],
      content: insult,
      tag: [{ type: "Mention", href: body.activity.actor }],
    },
  };
  log.debug("activity", { activity });

  return sendToRemoteInbox({ inbox, activity, config });
}

async function sendToRemoteInbox({ inbox, activity, config }) {
  const { log, ACTOR_KEY_URL, PRIVATE_KEY } = config;
  const inboxUrl = new URL(inbox);
  const { protocol, host, pathname, search } = inboxUrl;

  const path = pathname + search;
  const method = "POST";
  const headers = {
    Host: host,
    Date: new Date().toUTCString(),
  };
  const body = JSON.stringify(activity);

  const signature = signRequest({
    keyId: ACTOR_KEY_URL,
    privateKey: PRIVATE_KEY,
    method,
    path,
    headers,
  });

  const options = {
    method,
    body,
    headers: Object.assign({}, headers, { Signature: signature }),
  };

  const result = await fetch(`${protocol}//${host}${path}`, options);

  log.info("sendToRemoteInbox", { status: result.status, inbox, options });
}
