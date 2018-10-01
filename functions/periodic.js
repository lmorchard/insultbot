"use strict";

const config = require("../lib/config");

module.exports.get = async (event, context) => {
  const { log } = await config({ event, context });

  log.info("periodic");
};
