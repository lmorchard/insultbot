const fs = require("fs");
const path = require("path");
const util = require("util");

exports.dateNow = () => new Date().toISOString();

exports.readFile = util.promisify(fs.readFile);

exports.localPath = name => path.join(__dirname, "..", name);

exports.readTextFile = async name =>
  exports.readFile(exports.localPath(name), { encoding: "utf8" });

exports.pick = arr => arr[Math.floor(Math.random() * arr.length)];

// eslint-disable-next-line no-nested-ternary
exports.asc = (a, b) => (a < b ? -1 : b < a ? 1 : 0);

exports.loadTextLines = async name =>
  (await exports.readTextFile(name))
    .split(/\n/)
    .map(line => line.trim())
    .filter(line => !!line)
    .filter(line => line.substr(0, 1) !== "#");
