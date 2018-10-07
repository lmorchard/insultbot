"use strict";

const config = require("../lib/config");
const response = require("../lib/response");
const html = require("../lib/html");

module.exports.get = async (event, context) => {
  const { log } = await config({ event, context });
  log.info("summary");
  return response({
    event,
    html: htmlOutbox,
    data: {
      items: [],
    },
  });
};

const htmlOutbox = ({ items }) =>
  html.base({
    body: `
      <h1>Hello world!</h1>
      <div>${items}</div>
      `,
  });
