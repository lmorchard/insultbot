module.exports = ({ event, context, meta = {}, LOG_LEVEL }) => {
  const startTime = Date.now();

  const selector = "requestContext" in event ? selectRequest : selectBase;

  const out = { meta };

  LEVELS.forEach(level => {
    out[level] = (op, fields = {}) => {
      if (LEVELS_BY_INDEX[level] <= LEVELS_BY_INDEX[LOG_LEVEL]) {
        console.log(
          JSON.stringify(
            selector({
              startTime,
              event,
              context,
              level,
              op,
              fields,
              meta: out.meta,
            }),
            null,
            "  "
          )
        );
      }
    };
  });

  Object.entries(ALIASES).forEach(([alias, orig]) => (out[alias] = out[orig]));

  return out;
};

const LEVELS = [
  "emerg",
  "alert",
  "crit",
  "err",
  "warning",
  "notice",
  "info",
  "debug",
];

const ALIASES = {
  error: "err",
  critical: "crit",
  emergency: "emerg",
};

const LEVELS_BY_INDEX = LEVELS.reduce((acc, level, idx) => {
  acc[level] = idx;
  return acc;
}, {});

const selectRequest = ({
  startTime,
  event,
  context,
  level,
  op,
  fields = {},
  meta = {},
}) =>
  Object.assign(
    selectRequestEvent(event),
    selectBase({ startTime, context, level, op, fields, meta })
  );

const selectBase = ({
  startTime,
  context,
  level,
  op,
  fields = {},
  meta = {},
}) =>
  Object.assign(
    { timestamp: Date.now(), t: Date.now() - startTime, level, op },
    selectContext(context),
    meta,
    fields
  );

// https://docs.aws.amazon.com/lambda/latest/dg/eventsources.html#eventsources-api-gateway-request
const selectRequestEvent = ({
  path,
  httpMethod: method,
  requestContext: { userAgent: clientAgent, sourceIp: clientIp },
  headers: {
    Host: hostname,
    "User-Agent": agent,
    "X-Forwarded-For": remoteAddressChain,
  },
}) => ({
  path,
  method,
  clientAgent,
  clientIp,
  remoteAddressChain,
  agent,
  hostname,
});

// https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html
const selectContext = ({
  awsRequestId,
  functionName,
  functionVersion,
  memoryLimitInMB,
}) => ({
  awsRequestId,
  functionName,
  functionVersion,
  memoryLimitInMB,
});
