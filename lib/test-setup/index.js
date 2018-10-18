const sinon = require("sinon");
const AWS = require("aws-sdk");
const mockRequire = require("mock-require");

Object.assign(process.env, {
  LOG_LEVEL: "debug",
  HOSTNAME: "insultron.lmorchard.com",
  ACTOR_NAME: "Insultron2000",
  QUEUE_NAME: "AWS_SQS",
  OBJECTS_TABLE: "AWS_TABLE_OBJECTS",
  FOLLOWERS_TABLE: "AWS_TABLE_FOLLOWERS",
});

global.makePromiseFn = out => ({
  promise: () => Promise.resolve(out),
});

global.makePromiseStub = out => sinon.stub().returns(global.makePromiseFn(out));

global.constants = {
  QueueUrl: "https://example.com/sqs/",
  MessageId: "abba123",
};

global.mocks = {
  fetch: sinon.stub(),
};

mockRequire("node-fetch", global.mocks.fetch);

global.resetMocks = () => {
  const {
    mocks,
    makePromiseStub,
    constants: { QueueUrl, MessageId },
  } = global;

  global.mocks.fetch.reset();

  const pSQS = AWS.SQS.prototype;
  const pS3 = AWS.S3.prototype;
  const pDocumentClient = AWS.DynamoDB.DocumentClient.prototype;

  Object.assign(mocks, {
    queryItems: (pDocumentClient.query = makePromiseStub({})),
    scanItems: (pDocumentClient.scan = makePromiseStub({})),
    getItem: (pDocumentClient.get = makePromiseStub({})),
    putItem: (pDocumentClient.put = makePromiseStub({})),
    deleteItem: (pDocumentClient.delete = makePromiseStub({})),
    batchWrite: (pDocumentClient.batchWrite = makePromiseStub({})),
    getQueueUrl: (pSQS.getQueueUrl = makePromiseStub({ QueueUrl })),
    sendMessage: (pSQS.sendMessage = makePromiseStub({ MessageId })),
    putObject: (pS3.putObject = makePromiseStub({})),
    getObject: (pS3.getObject = makePromiseStub({})),
  });
};
