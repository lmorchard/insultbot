"use strict";

module.exports.get = async (event, context) => {
  const { log } = await config({ event, context });
  log.info("summary");
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html",
    },
    body: `<!DOCTYPE html>
      <html>
        <h1>Hello world!</h1>
        <pre>${JSON.stringify(event, null, " ")}</pre>
      </html>
    `,
  };
};
