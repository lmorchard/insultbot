"use strict";

const { URL } = require("url");
const fetch = require("node-fetch");

const AWS = require("aws-sdk");
const documentClient = new AWS.DynamoDB.DocumentClient();
const SQS = new AWS.SQS({ apiVersion: "2012-11-05" });
const S3 = new AWS.S3({ apiVersion: "2006-03-01" });

const { signRequest } = require("../lib/httpSignatures");
const { fetchJson } = require("../lib/request");
const setupConfig = require("../lib/config");
const { dateNow, uid, withContext } = require("../lib/utils");
const insults = require("../lib/insults");
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

  const commonParams = { record, body, context, config };
  switch (body.task) {
    case "deliverFromInbox":
      return handleFromInbox(commonParams);
    case "reindexSharedInboxes":
      return handleReindexSharedInboxes(commonParams);
  }

  return Promise.resolve();
};

async function handleFromInbox({ record, body, context, config }) {
  const { log, SITE_URL, STATIC_BUCKET: Bucket } = config;
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
    const sharedInboxes = await S3.getObject({
      Bucket,
      Key: "sharedInboxes.json",
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
    return handleFollow({ config, send, actor, actorDeref });
  }

  if (activity.type == "Undo" && object.type == "Follow") {
    return handleUnfollow({
      config,
      send,
      activity,
      object,
      actor,
      actorDeref,
    });
  }

  return Promise.resolve();
}

async function handleReindexSharedInboxes({ record, body, context, config }) {
  const { log, STATIC_BUCKET: Bucket } = config;

  // Get a list of followers - TODO: paginate if over 1000?
  const listResult = await S3.listObjects({
    Bucket,
    Prefix: `followers/`,
    MaxKeys: 1000,
  }).promise();

  // Fetch all the followers sequentially - TODO: do in batches?
  const followers = await listResult.Contents.map(({ Key }) =>
    S3.getObject({ Bucket, Key })
      .promise()
      .then(result => JSON.parse(result.Body.toString("utf-8")))
  ).reduce(
    (chain, current) =>
      chain.then(results => current.then(result => [...results, result])),
    Promise.resolve([])
  );

  // Extract all the unique shared inboxes from followers.
  const sharedInboxes = Array.from(
    new Set(followers.map(({ endpoints: { sharedInbox } }) => sharedInbox))
  );

  // Save the new list of shared inboxes
  const putResult = await S3.putObject({
    Bucket,
    Key: "sharedInboxes.json",
    ContentType: "application/json; charset=utf-8",
    Body: JSON.stringify(sharedInboxes),
  }).promise();

  log.debug("sharedInboxesPutResult", { putResult });
  log.info("reindexSharedInboxes", { count: sharedInboxes.length });
}

const actorToFollowId = actor => Buffer.from(actor, "utf8").toString("base64");

// const followIdToActor = followId =>
//   Buffer.from( followId, "base64").toString("utf8");

async function handleFollow({ config, send, actor, actorDeref }) {
  const { log, FOLLOWERS_TABLE, STATIC_BUCKET: Bucket } = config;

  log.info("follow", { actor, actorDeref });

  const followId = actorToFollowId(actor);

  const putResult = await Promise.all([
    S3.putObject({
      Bucket,
      Key: `followers/${followId}.json`,
      ContentType: "application/activity+json; charset=utf-8",
      Body: JSON.stringify(withContext(actorDeref), null, "  "),
    }).promise(),
    documentClient
      .put({
        TableName: FOLLOWERS_TABLE,
        Item: {
          id: actor,
          actor: JSON.stringify(actorDeref),
          datestamp: Date.now(),
        },
      })
      .promise(),
  ]);

  log.debug("followPut", { putResult });

  await enqueueReindexSharedInboxes({ config });

  return send(`Thanks for the follow, ${await insults.generate()}`);
}

async function handleUnfollow({ config, send, actor }) {
  const { log, FOLLOWERS_TABLE, STATIC_BUCKET: Bucket } = config;

  log.info("unfollow", { actor });

  const followId = actorToFollowId(actor);

  const deleteResult = await Promise.all([
    S3.deleteObject({
      Bucket,
      Key: `followers/${followId}.json`,
    }).promise(),
    documentClient
      .delete({
        TableName: FOLLOWERS_TABLE,
        Key: {
          id: actor,
        },
      })
      .promise(),
  ]);

  log.debug("unfollowDelete", { deleteResult });

  await enqueueReindexSharedInboxes({ config });

  return send(`I will miss you, ${await insults.generate()}`);
}

async function enqueueReindexSharedInboxes({ config }) {
  const { log, QUEUE_NAME: QueueName } = config;
  const { QueueUrl } = await SQS.getQueueUrl({ QueueName }).promise();
  const queueSendResult = await SQS.sendMessage({
    QueueUrl,
    MessageBody: JSON.stringify({ task: "reindexSharedInboxes" }),
  }).promise();
  log.info("enqueuedReindex", { queueSendResult });
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

  const putResult = await Promise.all([
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
