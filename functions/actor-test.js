const { expect } = require("chai");

describe("functions/actor", () => {
  const actor = require("./actor");

  beforeEach(() => {
    global.resetMocks();
  });

  describe("get", () => {
    it("exists", () => {
      expect(actor.get).to.not.be.undefined;
    });

    it("response with actor HTML", async () => {
      const response = await actor.get(
        { headers: { Accept: "text/html" } },
        {}
      );
      expect(response.body).to.contain("<h1>Insultron2000</h1>");
      expect(response.statusCode).to.equal(200);
      expect(response.headers["Content-Type"]).to.equal("text/html");
    });

    it("response with actor JSON", async () => {
      const response = await actor.get(
        { headers: { Accept: "application/json" } },
        {}
      );
      expect(JSON.parse(response.body).name).to.equal(process.env.ACTOR_NAME);
      expect(response.statusCode).to.equal(200);
      expect(response.headers["Content-Type"]).to.equal(
        "application/activity+json"
      );
    });
  });
});
