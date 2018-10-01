"use strict";

const AWS = require("aws-sdk");
const SQS = new AWS.SQS({ apiVersion: "2012-11-05" });
const fetch = require("node-fetch");

const config = require("../lib/config");
const response = require("../lib/response");
const { verifyRequest } = require("../lib/httpSignatures");

module.exports.get = async (event, context) => {
  const { log } = await config({ event, context });

  log.info("get");

  return response.html({
    body: `
      <!DOCTYPE html>
      <html>
        <h1>Hello world!</h1>
      </html>
    `,
  });
};

module.exports.post = async (event, context) => {
  const { log, HOSTNAME, QUEUE_NAME: QueueName } = await config({
    event,
    context,
  });

  let activity;
  try {
    activity = JSON.parse(event.body);
  } catch (e) {
    log.error("malformed", { body: event.body });
    return response.json({
      status: 400,
      error: "malformed body",
    });
  }

  const { httpMethod: method, path, headers } = event;
  const signatureVerified = await verifyRequest({
    fetch,
    method,
    path,
    headers: Object.assign({}, headers, { Host: HOSTNAME }),
  });
  if (!signatureVerified) {
    log.warning("invalidSignature", { method, path, headers });
    return response.forbidden({
      data: { error: "invalid HTTP signature" },
    });
  }

  const { QueueUrl } = await SQS.getQueueUrl({ QueueName }).promise();
  const MessageBody = JSON.stringify({
    source: "inbox",
    activity,
  });
  const queueSendResult = await SQS.sendMessage({
    QueueUrl,
    MessageBody,
  }).promise();

  log.info("enqueued", { MessageBody, queueSendResult });
  return response.json({ status: 202 });
};
