const html = (module.exports = {});

html.base = ({ head = "", body = "" }) => `<!doctype html>
<html>
  <head>
    ${head}
  </head>
  <body>
    ${body}
  </body>
</html>`;
