"use strict";

module.exports.get = async (event, context) => {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "text/html"
    },
    body: `<!DOCTYPE html>
      <html>
        <h1>Hello world!</h1>
      </html>
    `
  };
};
