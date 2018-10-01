"use strict";

const AWS = require("aws-sdk");
const documentClient = new AWS.DynamoDB.DocumentClient();

const config = require("../lib/config");
const response = require("../lib/response");

module.exports.get = async (event, context) => {
  const { log, OBJECTS_TABLE: TableName } = await config({ event, context });
  const { uuid } = event.pathParameters;

  try {
    const getResult = await documentClient
      .get({ TableName, Key: { uuid } })
      .promise();
    log.debug("getResult", { getResult });

    log.info("summary");
    return response.json({ data: getResult.Item });
  } catch (e) {
    return response.notFound();
  }
};
