"use strict";

const { URL } = require("url");
const fetch = require("node-fetch");
const uuidv1 = require("uuid/v1");

const AWS = require("aws-sdk");
const documentClient = new AWS.DynamoDB.DocumentClient();

const { signRequest } = require("../lib/httpSignatures");
const { fetchJson } = require("../lib/request");
const setupConfig = require("../lib/config");
const insults = require("../lib/insults");
const { dateNow } = require("../lib/utils");

const ID_PUBLIC = "https://www.w3.org/ns/activitystreams#Public";

exports.handler = async (event, context) => {
  const config = await setupConfig({ event, context });
  await insults.init();
  await Promise.all(
    event.Records.map(record =>
      exports.deliver({ record, context, config })
    )
  );
};

exports.deliver = async ({ record, context, config }) => {
  const { log } = config;
  const body = JSON.parse(record.body);

  log.info("deliver", { record, body });

  if (body.source === "inbox") {
    return deliverFromInbox({ record, body, context, config });
  }

  return Promise.resolve();
};

async function deliverFromInbox({ record, body, context, config }) {
  const { log } = config;
  const { activity = {} } = body;
  const { object = {} } = activity;

  if (activity.type == "Create" && object.type == "Note") {
    return sendCreateNote({
      config,
      actor: activity.actor,
      inReplyTo: object.url,
      content: await insults.generate(),
    });
  }

  if (activity.type == "Like") {
    return sendCreateNote({
      config,
      actor: activity.actor,
      inReplyTo: object.url,
      content: `Oh you liked that, did you? ${await insults.generate()}`,
    });
  }

  if (activity.type == "Follow") {
    log.info("follow", { actor: activity.actor });
    return sendCreateNote({
      config,
      actor: activity.actor,
      inReplyTo: object.url,
      content: `Thanks for the follow, ${await insults.generate()}`,
    });
  }

  if (activity.type == "Undo" && object.type == "Follow") {
    log.info("unfollow", { actor: activity.actor });
    return sendCreateNote({
      config,
      actor: activity.actor,
      inReplyTo: object.url,
      content: `I will miss you, ${await insults.generate()}`,
    });
  }

  return Promise.resolve();
}

async function sendCreateNote({ config, actor, content, inReplyTo }) {
  const { log, ACTOR_URL, SITE_URL, OBJECTS_TABLE: TableName } = config;

  let actorDeref, inbox;
  try {
    actorDeref = await fetchJson(actor);
    inbox = actorDeref.inbox;
  } catch (error) {
    log.error("actorFetchFailure", { actor, error });
    return Promise.resolve();
  }

  const objectUuid = uuidv1();
  const object = {
    "@context": [
      "https://www.w3.org/ns/activitystreams",
      "https://w3id.org/security/v1",
    ],
    type: "Note",
    uuid: objectUuid,
    id: `${SITE_URL}/objects/${objectUuid}`,
    published: dateNow(),
    attributedTo: ACTOR_URL,
    inReplyTo,
    to: [actor],
    cc: [actorDeref.followers, ID_PUBLIC],
    content: `<p><span class="h-card"><a href="${actorDeref.url}" class="u-url mention">@<span>${actorDeref.preferredUsername}</span></a></span> ${content}</p>`,
    tag: [{ type: "Mention", href: actor }],
  };

  const activityUuid = uuidv1();
  const activity = {
    "@context": [
      "https://www.w3.org/ns/activitystreams",
      "https://w3id.org/security/v1",
    ],
    uuid: activityUuid,
    id: `${SITE_URL}/objects/${activityUuid}`,
    type: "Create",
    actor: ACTOR_URL,
    to: object.to,
    cc: [actorDeref.followers, ID_PUBLIC],
    object,
  };

  log.debug("activity", { activity });

  const putResult = await documentClient
    .batchWrite({
      RequestItems: {
        [TableName]: [
          { PutRequest: { Item: object } },
          { PutRequest: { Item: activity } },
        ],
      },
    })
    .promise();

  log.debug("put", { putResult });

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
