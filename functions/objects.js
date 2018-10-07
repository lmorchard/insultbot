"use strict";

const AWS = require("aws-sdk");
const documentClient = new AWS.DynamoDB.DocumentClient();

const config = require("../lib/config");
const response = require("../lib/response");
const html = require("../lib/html");

module.exports.get = async (event, context) => {
  const { log, OBJECTS_TABLE: TableName } = await config({ event, context });
  const { uuid } = event.pathParameters;

  try {
    const getResult = await documentClient
      .get({ TableName, Key: { uuid } })
      .promise();
    log.debug("getResult", { getResult });

    log.info("summary");
    return response({
      event,
      jsonType: "application/activity+json",
      html: htmlObject,
      data: getResult.Item,
    });
  } catch (e) {
    return response.notFound({ event });
  }
};

const htmlObject = ({ id, type, published, to, cc, tag, content, object }) =>
  html.base({
    body: `
      <div>
        <h1>${id}</h1>
        <h2>${type}</h2>
        <h3>${published}</h3>
        <p>${content}</p>
      </div>
      `,
  });
