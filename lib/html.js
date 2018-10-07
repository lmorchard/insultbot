const html = ({ head = "", body = "" }) => `<!doctype html>
<html>
  <head>
    ${head}
  </head>
  <body>
    ${body}
  </body>
</html>`;

html.actor = async ({ id, name, summary, icon }) =>
  html({
    body: `
      <div>
        <h1>${name}</h1>
        <img src="${icon.url}" />
        <p>${summary}</p>
      </div>
      `,
  });

html.object = ({ id, type, published, to, cc, tag, content, object }) =>
  html({
    body: `
      <div>
        <h1>${id}</h1>
        <h2>${type}</h2>
        <h3>${published}</h3>
        <p>${content}</p>
      </div>
      `,
  });

html.outbox = ({ items }) =>
  html({
    body: `
      <h1>Hello world!</h1>
      <div>${items}</div>
      `,
  });

html.webfinger = ({ subject, links }) =>
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

module.exports = html;
