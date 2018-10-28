const { expect } = require("chai");

describe("functions/queue/updateSharedInboxes", () => {
  const updateSharedInboxes = require("./updateSharedInboxes");

  beforeEach(() => {
    global.resetMocks();
  });

  it("exists", () => {
    expect(updateSharedInboxes).to.not.be.undefined;
  });
});
