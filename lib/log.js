module.exports = ({ event, context, meta = {}, LOG_LEVEL }) => {
  const startTime = Date.now();

  const selector = "requestContext" in event ? selectRequest : selectBase;

  const out = { meta };

  LEVELS.forEach(level => {
    out[level] = (eventType, fields = {}) => {
      if (LEVELS_BY_INDEX[level] <= LEVELS_BY_INDEX[LOG_LEVEL]) {
        console.log(
          JSON.stringify(
            selector({
              startTime,
              event,
              context,
              level,
              eventType,
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

const selectBase = ({
  startTime,
  context,
  level,
  eventType,
  fields = {},
  meta = {},
}) =>
  Object.assign(
    {
      timestamp: Date.now(),
      executionTime: Date.now() - startTime,
      level,
      eventType,
    },
    selectContext(context),
    meta,
    fields
  );

const selectRequest = ({
  startTime,
  event,
  context,
  level,
  eventType,
  fields = {},
  meta = {},
}) =>
  Object.assign(
    selectRequestEvent(event),
    selectBase({ startTime, context, level, eventType, fields, meta })
  );

// https://docs.aws.amazon.com/lambda/latest/dg/eventsources.html#eventsources-api-gateway-request
const selectRequestEvent = ({
  path,
  httpMethod: method,
  headers: { "User-Agent": agent, "X-Forwarded-For": clientIPs },
}) => ({
  path,
  method,
  agent,
  clientIPs: clientIPs.split(", "),
});

// https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html
const selectContext = ({ awsRequestId, functionName, functionVersion }) => ({
  awsRequestId,
  functionName,
  functionVersion,
});
