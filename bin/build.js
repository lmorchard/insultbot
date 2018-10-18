#!/usr/bin/env
const path = require("path");
const fs = require("fs-extra");

const BUILD_PATH = path.join(__dirname, "..", "build");
const STATIC_PATH = path.join(__dirname, "..", "static");

const html = require("../lib/html");
const mkconfig = require("../lib/config");

async function init() {
  const config = await mkconfig();

  console.log("Cleaning build.");
  await fs.remove(BUILD_PATH);
  await fs.ensureDir(BUILD_PATH);

  console.log("Copying static resources.");
  await fs.copy(STATIC_PATH, BUILD_PATH);

  console.log("Building static resources:");
  await Promise.all([
    hostmeta,
    webfinger,
    actor,
    indexHTML,
  ].map(async (fn) => {
    const [ name, content ] = await fn(config);
    console.log(`\t${name}`);
    fs.outputFile(path.join(BUILD_PATH, name), content);
  }));
}

const json = data => JSON.stringify(data, null, "  ");

const hostmeta = async ({ SITE_URL }) => [
  ".well-known/host-meta",
  `<?xml version="1.0" encoding="UTF-8"?>
    <XRD xmlns="http://docs.oasis-open.org/ns/xri/xrd-1.0">
      <Link
        rel="lrdd"
        type="application/xrd+xml"
        template="${SITE_URL}/.well-known/webfinger?resource={uri}" />
    </XRD>`.trim(),
];

const webfinger = async ({ ACTOR_NAME, HOSTNAME, ACTOR_URL }) => [
  `.well-known/webfinger/${ACTOR_NAME}.json`,
  json({
    subject: `acct:${ACTOR_NAME}@${HOSTNAME}`,
    links: [
      {
        rel: "self",
        type: "application/activity+json",
        href: ACTOR_URL,
      },
    ],
  }),
];

const actor = async config => [
  "actor.json",
  json(actorData(config)),
];

const indexHTML = async config => [
  "index.html",
  await html.actor(actorData(config)),
];

const actorData = ({
  ACTOR_NAME,
  SITE_URL,
  ACTOR_URL,
  PUBLIC_KEY,
}) => ({
  "@context": [
    "https://www.w3.org/ns/activitystreams",
    "https://w3id.org/security/v1",
  ],
  type: "Person",
  id: ACTOR_URL,
  url: SITE_URL,
  name: ACTOR_NAME,
  preferredUsername: ACTOR_NAME,
  inbox: `${SITE_URL}/inbox`,
  outbox: `${SITE_URL}/outbox`,
  summary: `<p>
    I am Insultron2000. I am here to serve you. With insults.
    Follow me for automatic service! I belong to
    <a href="https://lmorchard.com">lmorchard</a>
    and you may peer at my innards,
    <a href="https://github.com/lmorchard/insultbot">if you like</a>.
  </p>`.trim(),
  icon: {
    type: "Image",
    mediaType: "image/png",
    url: `${SITE_URL}/avatar.png`,
  },
  publicKey: {
    id: `${ACTOR_URL}#main-key`,
    owner: ACTOR_URL,
    publicKeyPem: PUBLIC_KEY,
  },
});

init()
  .then(() => console.log("Build done."))
  .catch(console.error);
