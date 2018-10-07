"use strict";

const config = require("../lib/config");
const response = require("../lib/response");
const html = require("../lib/html");

module.exports.get = async (event, context) => {
  const { log, ACTOR_NAME, HOSTNAME, ACTOR_URL } = await config({
    event,
    context,
  });

  const expectedAcct = `acct:${ACTOR_NAME}@${HOSTNAME}`;

  const { resource } = event.queryStringParameters || {};

  if (resource !== expectedAcct) {
    log.warning("notfound", { resource, expectedAcct });
    return response.notFound();
  }

  log.info("found", { resource });
  return response({
    event,
    jsonType: "application/jrd+json",
    html: htmlWebfinger,
    data: {
      subject: expectedAcct,
      links: [
        {
          rel: "self",
          type: "application/activity+json",
          href: ACTOR_URL,
        },
      ],
    },
  });
};

const htmlWebfinger = ({ subject, links }) =>
  html.base({
    body: `
      <dl>
        <dt>Subject</dt><dd>${subject}</dd>
        <dt>Links</dt>
        <dd>
          <ul>
            ${links.map(
              ({ rel, type, href }) => `
              <li><a href="${href}">${rel} - ${type}</a></li>
            `
            )}
          </ul>
        </dd>
      </dl>
      `,
  });
