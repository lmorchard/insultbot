"use strict";

const { URL } = require("url");
const fetch = require("node-fetch");
const uuidv1 = require("uuid/v1");

const AWS = require("aws-sdk");
const documentClient = new AWS.DynamoDB.DocumentClient();

const { signRequest } = require("../lib/httpSignatures");
const { fetchJson } = require("../lib/request");
const setupConfig = require("../lib/config");
const { dateNow } = require("../lib/utils");
const insults = require("../lib/insults");

const ID_PUBLIC = "https://www.w3.org/ns/activitystreams#Public";

exports.handler = async (event, context) => {
  const config = await setupConfig({ event, context });
  await insults.init();
  await Promise.all(
    event.Records.map(record => exports.deliver({ record, context, config }))
  );
};

exports.deliver = async ({ record, context, config }) => {
  const { log } = config;
  const body = JSON.parse(record.body);

  log.info("deliver", { record, body });

  if (body.source === "inbox") {
    return handleFromInbox({ record, body, context, config });
  }

  return Promise.resolve();
};

async function handleFromInbox({ record, body, context, config }) {
  const { log, SITE_URL, FOLLOWERS_TABLE } = config;
  const { activity = {} } = body;
  const { actor, object = {} } = activity;

  if (activity.type == "Delete" && actor == activity.object) {
    // Ignore reports of deleted users.
    log.debug("userDeleted", { actor });
    return Promise.resolve();
  }

  let actorDeref;
  try {
    actorDeref = await fetchJson(actor);
  } catch (error) {
    log.error("actorFetchFailure", { actor, error });
    return Promise.resolve();
  }

  const send = content =>
    sendCreateNote(
      Object.assign({
        config,
        actor,
        actorDeref,
        inReplyTo: object.url,
        content,
      })
    );

  if (activity.type == "Create" && object.type == "Note") {
    return send(await insults.generate());
  }

  if (activity.type == "Like") {
    return send(`Oh you liked that, did you? ${await insults.generate()}`);
  }

  if (activity.type == "Announce" && activity.object.startsWith(SITE_URL)) {
    return send(`Thank you for the boost, ${await insults.generate()}`);
  }

  if (activity.type == "Follow") {
    log.info("follow", { actor, actorDeref });

    const putResult = await documentClient
      .put({
        TableName: FOLLOWERS_TABLE,
        Item: {
          id: actor,
          actor: JSON.stringify(actorDeref),
          datestamp: Date.now(),
        },
      })
      .promise();

    log.debug("followPut", { putResult });

    return send(`Thanks for the follow, ${await insults.generate()}`);
  }

  if (activity.type == "Undo" && object.type == "Follow") {
    log.info("unfollow", { actor: activity.actor });

    const deleteResult = await documentClient
      .delete({
        TableName: FOLLOWERS_TABLE,
        Key: {
          id: actor,
        },
      })
      .promise();

    log.debug("unfollowDelete", { deleteResult });

    return send(`I will miss you, ${await insults.generate()}`);
  }

  return Promise.resolve();
}

async function sendCreateNote({
  config,
  actor,
  actorDeref,
  content,
  inReplyTo,
}) {
  const { log, ACTOR_URL, SITE_URL, OBJECTS_TABLE: TableName } = config;
  const { inbox, followers, url, preferredUsername } = actorDeref;

  const objectUuid = uuidv1();
  const object = {
    type: "Note",
    uuid: objectUuid,
    id: `${SITE_URL}/objects/${objectUuid}`,
    published: dateNow(),
    attributedTo: ACTOR_URL,
    inReplyTo,
    to: [ID_PUBLIC],
    cc: [actor, followers],
    tag: [{ type: "Mention", href: actor }],
    content: `
      <p>
        <span class="h-card">
          <a href="${url}" class="u-url mention">@<span>${preferredUsername}</span></a>
        </span>
        ${content}
      </p>
    `.trim(),
  };

  const activityUuid = uuidv1();
  const activity = {
    uuid: activityUuid,
    id: `${SITE_URL}/objects/${activityUuid}`,
    type: "Create",
    actor: ACTOR_URL,
    to: object.to,
    cc: object.cc,
    object,
  };

  log.debug("createNoteActivity", { activity });

  const withContext = data =>
    Object.assign({
      "@context": [
        "https://www.w3.org/ns/activitystreams",
        "https://w3id.org/security/v1",
      ],
    }, data);

  const putResult = await documentClient
    .batchWrite({
      RequestItems: {
        [TableName]: [
          { PutRequest: { Item: withContext(object) } },
          { PutRequest: { Item: withContext(activity) } },
        ],
      },
    })
    .promise();

  log.debug("putCreateNoteActivity", { putResult });

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

  const { status } = await fetch(`${protocol}//${host}${path}`, options);

  log.info("sendToRemoteInbox", { status, inbox, options });
}
