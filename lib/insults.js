const fs = require("fs");
const util = require("util");
const readFile = util.promisify(fs.readFile);

const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const dataFn = name => `${__dirname}/../data/${name}`;
const dataFile = name => readFile(dataFn(name), { encoding: "utf8" });
const loadTextLines = async name =>
  (await dataFile(name))
    .split(/\n/)
    .map(line => line.trim())
    .filter(line => !!line)
    .filter(line => line.substr(0, 1) !== "#");

const insults = (module.exports = {});

insults.init = async () => {
  insults.shakespeare = await insults.initShakespeare();
  return true;
};

insults.generate = async () => {
  return insults.generateShakespeare();
};

insults.initShakespeare = async () =>
  (await loadTextLines("shakespeare.txt"))
    .map(line => line.split(/\s+/))
    .reduce(
      ([col1, col2, col3], [i1, i2, i3]) => [
        i1 ? [...col1, i1] : col1,
        i2 ? [...col2, i2] : col2,
        i3 ? [...col3, i3] : col3
      ],
      [[], [], []]
    );

insults.generateShakespeare = async () =>
  [
    "Thou",
    pick(insults.shakespeare[0]),
    pick(insults.shakespeare[1]),
    pick(insults.shakespeare[2])
  ].join(" ");
