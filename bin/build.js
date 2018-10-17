#!/usr/bin/env
const fs = require("fs");

fs.writeFileSync("./static/now.json", `{ "now": ${Date.now()} }`);
