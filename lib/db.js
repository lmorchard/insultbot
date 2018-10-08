const AWS = require("aws-sdk");
const documentClient = new AWS.DynamoDB.DocumentClient();

const db = (module.exports = {});

const latestObjectsByType = (TableName, type) =>
  documentClient
    .query({
      TableName,
      IndexName: "byPublished",
      Limit: 10,
      ScanIndexForward: false,
      KeyConditionExpression: "#t1 = :t2",
      ExpressionAttributeNames: { "#t1": "type" },
      ExpressionAttributeValues: { ":t2": type },
    })
    .promise()
    .then(result => result.Items);

db.latestNotes = async ({ TableName }) =>
  latestObjectsByType(TableName, "Note");

db.latestCreate = async ({ TableName }) =>
  latestObjectsByType(TableName, "Create");
