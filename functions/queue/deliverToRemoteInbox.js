const { URL } = require("url");
const fetch = require("node-fetch");

const { signRequest } = require("../../lib/httpSignatures");
const { withContext } = require("../../lib/utils");

module.exports = async ({ body: { inbox, activity }, config }) => {
  const { log, ACTOR_KEY_URL, PRIVATE_KEY } = config;
  const inboxUrl = new URL(inbox);
  const { protocol, host, pathname, search } = inboxUrl;

  const path = pathname + search;
  const method = "POST";
  const headers = {
    Host: host,
    Date: new Date().toUTCString(),
  };
  const body = JSON.stringify(withContext(activity));

  const signature = signRequest({
    keyId: ACTOR_KEY_URL,
    privateKey: PRIVATE_KEY,
    method,
    path,
    headers,
  });

  const options = {
    method,
    body,
    headers: Object.assign({}, headers, { Signature: signature }),
  };

  const { status } = await fetch(`${protocol}//${host}${path}`, options);

  log.info("deliverToRemoteInbox", { status, inbox, options });
};
