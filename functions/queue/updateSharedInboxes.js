"use strict";

const AWS = require("aws-sdk");
const S3 = new AWS.S3({ apiVersion: "2006-03-01" });

module.exports = async ({ body, config }) => {
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
};
