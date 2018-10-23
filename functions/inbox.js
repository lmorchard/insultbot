"use strict";

const AWS = require("aws-sdk");
const SQS = new AWS.SQS({ apiVersion: "2012-11-05" });
const fetch = require("node-fetch");

const config = require("../lib/config");
const response = require("../lib/response");
const { verifyRequest } = require("../lib/httpSignatures");

module.exports.post = async (event, context) => {
  const { log, HOSTNAME, QUEUE_NAME: QueueName } = await config({
    event,
    context,
  });

  const { httpMethod: method, path, headers, body } = event;

  let activity;
  try {
    activity = JSON.parse(body);
  } catch (e) {
    log.error("malformedBody", { body });
    return response.badRequest({ event, data: { error: "malformed body" } });
  }

  // Skip verification for Delete because the public key will be gone.
  if (activity.type !== "Delete") {
    try {
      const signatureVerified = await verifyRequest({
        fetch,
        method,
        path,
        headers: Object.assign({}, headers, { Host: HOSTNAME }),
      });
      if (!signatureVerified) {
        log.warning("invalidSignature", { method, path, headers });
        return response.forbidden({
          event,
          data: { error: "invalid HTTP signature" },
        });
      }
    } catch (e) {
      log.error("signatureVerificationFailed", { error: e });
      return response.forbidden({
        event,
        data: { error: "HTTP signature validation failed" },
      });
    }
  }

  const MessageBody = { task: "deliverFromInbox", activity };
  log.debug("MessageBody", { MessageBody });

  const { QueueUrl } = await SQS.getQueueUrl({ QueueName }).promise();
  const queueSendResult = await SQS.sendMessage({
    QueueUrl,
    MessageBody: JSON.stringify(MessageBody),
  }).promise();
  log.info("enqueued", { queueSendResult });

  return response.accepted({ event });
};
