"use strict";

const { URL } = require("url");
const fetch = require("node-fetch");

const AWS = require("aws-sdk");
const documentClient = new AWS.DynamoDB.DocumentClient();
const S3 = new AWS.S3({ apiVersion: "2006-03-01" });

const { signRequest } = require("../lib/httpSignatures");
const { fetchJson } = require("../lib/request");
const setupConfig = require("../lib/config");
const { dateNow, uid, withContext } = require("../lib/utils");
const insults = require("../lib/insults");
const db = require("../lib/db");
const html = require("../lib/html");

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

  // TODO: Move all of this delivery into separate queue function executions
  const send = async content => {
    const activity = await createNote({
      config,
      actor,
      actorDeref,
      inReplyTo: object.url,
      content,
    });
    await sendToRemoteInbox({ inbox: actorDeref.inbox, activity, config });
    const sharedInboxes = await db.getSharedInboxes({
      followersTableName: FOLLOWERS_TABLE,
    });
    for (let inbox of sharedInboxes) {
      await sendToRemoteInbox({ inbox, activity, config });
    }
  };

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

async function createNote({ config, actor, actorDeref, content, inReplyTo }) {
  const { log, ACTOR_URL, SITE_URL, STATIC_BUCKET: Bucket } = config;
  const { followers, url, preferredUsername } = actorDeref;

  const objectUuid = uid();

  const object = {
    type: "Note",
    id: `${SITE_URL}/objects/Note/${objectUuid}.json`,
    url: `${SITE_URL}/objects/Note/${objectUuid}.html`,
    published: dateNow(),
    attributedTo: ACTOR_URL,
    inReplyTo,
    to: [ID_PUBLIC],
    cc: [actor, followers],
    tag: [{ type: "Mention", href: actor }],
    content: `<p><span class="h-card"><a href="${url}" class="u-url mention">@<span>${preferredUsername}</span></a> </span>${content}</p>`,
  };

  const activity = {
    id: `${SITE_URL}/objects/Create/${objectUuid}.json`,
    url: `${SITE_URL}/objects/Create/${objectUuid}.html`,
    type: "Create",
    actor: ACTOR_URL,
    published: dateNow(),
    to: object.to,
    cc: object.cc,
    object,
  };

  log.debug("createNoteActivity", { activity });

  const putResult = Promise.all([
    S3.putObject({
      Bucket,
      Key: `objects/Note/${objectUuid}.json`,
      ContentType: "application/activity+json; charset=utf-8",
      Body: JSON.stringify(withContext(object), null, "  "),
    }).promise(),
    S3.putObject({
      Bucket,
      Key: `objects/Note/${objectUuid}.html`,
      ContentType: "text/html; charset=utf-8",
      Body: await html.object(object),
    }).promise(),
    S3.putObject({
      Bucket,
      Key: `objects/Create/${objectUuid}.json`,
      ContentType: "application/activity+json; charset=utf-8",
      Body: JSON.stringify(withContext(activity), null, "  "),
    }).promise(),
    S3.putObject({
      Bucket,
      Key: `objects/Create/${objectUuid}.html`,
      ContentType: "text/html; charset=utf-8",
      Body: await html.object(activity),
    }).promise(),
  ]);

  log.debug("putCreateNoteActivity", { putResult });

  return activity;
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
  const body = JSON.stringify(withContext(activity));

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
