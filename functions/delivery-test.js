const { expect } = require("chai");

describe("functions/delivery", () => {

  const delivery = require("./delivery");

  beforeEach(() => {
    global.resetMocks();
  });

  it("exists", () => {
    expect(delivery).to.not.be.undefined;
  });

  describe("handler", () => {
    it("exists", () => {
      expect(delivery.handler).to.not.be.undefined;
    });
  });

  describe("deliver", () => {
    it("exists", () => {
      expect(delivery.deliver).to.not.be.undefined;
    });
  });

});
