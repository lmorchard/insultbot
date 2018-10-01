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

  log.info("deliver", { record, body });

  if (body.source === "inbox") {
    return deliverFromInbox({ record, body, context, config });
  }

  return Promise.resolve();
};

async function deliverFromInbox({ record, body, context, config }) {
  const { log, ACTOR_URL, SITE_URL, OBJECTS_TABLE: TableName } = config;
  const actorFrom = await fetchJson(body.activity.actor);
  const inbox = actorFrom.inbox;

  const insult = await insults.generate();
  log.debug("insult", { insult });

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
    inReplyTo: body.activity.url,
    to: [body.activity.actor],
    cc: [actorFrom.followers, ID_PUBLIC],
    content: insult,
    tag: [{ type: "Mention", href: body.activity.actor }],
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
