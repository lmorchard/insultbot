const { expect } = require("chai");

describe("lib/httpSignatures", () => {
  const httpSignatures = require("./httpSignatures");

  describe("parseSigParts", () => {
    const subject = httpSignatures.parseSigParts;

    it("properly parses", () => {
      const signature =
        "OZ152Q2Rb2YpXsAKOmeSOyu0K4FzhoDsJQ69e1alt6tCObVdZH4cfr+s853hhkTVwJRNv3e5BPex7mfhlNzc6gRqQ3OaHzCn38z2qA9sF51R1hubtW/5WNm/NKEE5r8CpExXoPd4nFIiFLXhck0dxnB+CJjxEpPjWyHA0krTVrfZ4S7Oq0oPlwqjbQ98NyomiRCQOQ+zUGAQa/xwe7+nwFbBHw2dsDGS7OEUGmY3nworJ4LeGKECJy7owqm+vID+xNTEIisR9yznAhP/v7RruBXoYvuM0MTdHwCtZ1LFbsQTkTXHVeHmKuRPxTggf/CZBj/LMkGqIFNGcRA9iRb4dQ==";
      const header = `keyId="http://lmorchard-mastodev.ngrok.io/users/admin#main-key",algorithm="rsa-sha256",headers="(request-target) host date digest content-type",signature="${signature}"`;
      const parts = subject(header);
      expect(parts.signature).to.equal(signature);
    });
  });
});
