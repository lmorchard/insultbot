"use strict";

const config = require("../lib/config");
const response = require("../lib/response");

module.exports.get = async (event, context) => {
  const { log, ACTOR_NAME } = await config({ event, context });

  log.info("summary");

  return response.html({
    body: `
    <!DOCTYPE html>
    <html>
      <h1>${ACTOR_NAME} Hello world!</h1>
    </html>
  `,
  });
};
