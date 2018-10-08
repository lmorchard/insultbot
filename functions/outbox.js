"use strict";

const config = require("../lib/config");
const response = require("../lib/response");
const html = require("../lib/html");
const db = require("../lib/db");

module.exports.get = async (event, context) => {
  const { log, SITE_URL, OBJECTS_TABLE: TableName } = await config({
    event,
    context,
  });

  log.info("summary");

  return response({
    event,
    headers: { "Cache-Control": "max-age=10" },
    html: html.outbox,
    data: {
      id: `${SITE_URL}/outbox`,
      type: "OrderedCollection",
      orderedItems: await db.latestCreate({ TableName }),
    },
  });
};
