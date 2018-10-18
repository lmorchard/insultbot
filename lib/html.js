const html = (module.exports = ({ head = "", body = "" }) => `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    ${head}
  </head>
  <body>
    ${body}
  </body>
</html>`);

html.actor = async ({ id, name, summary, icon, notes = [] }) =>
  html({
    body: `
      <div>
        <h1>${name}</h1>
        <img src="${icon.url}" style="width: 128px;" />
        <p>${summary}</p>
        <ul>
          ${notes
            .map(
              ({ id, published, content }) => `
            <li><a href="${id}">${published}</a>: ${content}</li>
          `
            )
            .join("\n")}
        </ul>
      </div>
      `,
  });

html.outbox = async ({ orderedItems = [] }) =>
  html({
    body: `
      <div>
        <ul>
          ${orderedItems
            .map(
              ({ object: { id, url, published, content } }) => `
            <li><a href="${url}">${published}</a>: ${content}</li>
          `
            )
            .join("\n")}
        </ul>
      </div>
      `,
  });

html.object = async ({ id, type, published, to, cc, tag, content, object }) =>
  html({
    body: `
      <div>
        <h2>${type}</h2>
        <h3>${published}</h3>
        <p>${content}</p>
      </div>
      `,
  });

html.webfinger = async ({ subject, links }) =>
  html({
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
