const { expect } = require("chai");
const AWS = require("aws-sdk-mock");
const setupConfig = require("../../lib/config");

describe("functions/queue", () => {
  const queue = require("./index");
  const tasks = queue.tasks;

  beforeEach(() => {
    global.resetMocks();
  });

  it("exists", () => {
    expect(queue).to.not.be.undefined;
  });

  describe("handler", () => {
    it("exists", () => {
      expect(queue.handler).to.not.be.undefined;
    });
  });

  describe("enqueue", () => {
    const { enqueue } = queue;

    it("exists", () => {
      expect(enqueue).to.not.be.undefined;
    });

    it("includes all the tasks", () => {
      tasks.forEach(task => expect(task in enqueue).to.be.true);
    });

    it("enqueues expected body for task", async () => {
      const config = await setupConfig();
      const sqsGetQueueUrlMock = AWS.mock(
        "SQS",
        "getQueueUrl",
        ({ QueueName }, cb) => cb(null, { QueueUrl: `aws::${QueueName}` })
      );
      const sqsSendMessageMock = AWS.mock("SQS", "sendMessage", (params, cb) =>
        cb(null, { MessageId: "8675309" })
      );
      await enqueue.receiveFromInbox({ config, body: { activity: "foo" } });
      expect(sqsGetQueueUrlMock.stub.callCount).to.equal(1);
      expect(sqsSendMessageMock.stub.args[0][0]).to.deep.equal({
        QueueUrl: "aws::AWS_SQS",
        MessageBody: '{"task":"receiveFromInbox","activity":"foo"}',
      });
    });
  });
});
