const crypto = require("crypto");
const { asc } = require("./utils");
const { fetchJson } = require("./request");

const signRequest = ({
  keyId,
  privateKey,
  method,
  path,
  headers,
  algorithm = "SHA256",
}) => {
  const lcHeaders = normalizeHeaders(headers);
  const headerNames = Object.keys(lcHeaders).sort(asc);
  const toSign = requestCleartext({ method, path, headerNames, lcHeaders });

  const signature = crypto
    .createSign(normalizeAlgorithm(algorithm))
    .update(toSign)
    .sign(privateKey, "base64");

  return [
    `keyId="${keyId}"`,
    `headers="(request-target) ${headerNames.join(" ")}"`,
    `signature="${signature}"`,
  ].join(", ");
};

const verifyRequest = async ({ method, path, headers }) => {
  const lcHeaders = normalizeHeaders(headers);
  const sigParts = parseSigParts(lcHeaders.signature);

  const {
    signature,
    keyId,
    algorithm = "SHA256",
    headers: sigHeaders,
  } = sigParts;

  const headerNames = sigHeaders
    .split(" ")
    .filter(k => k !== "(request-target)");
  const toVerify = requestCleartext({ method, path, headerNames, lcHeaders });

  const key = await getPublicKey({ keyId });
  if (!key) return false;

  return crypto
    .createVerify(normalizeAlgorithm(algorithm))
    .update(toVerify)
    .verify(key, signature, "base64");
};

const requestCleartext = ({
  method = "POST",
  path = "/",
  headerNames,
  lcHeaders,
}) =>
  `(request-target): ${method.toLowerCase()} ${path}\n` +
  headerNames.map(k => `${k}: ${lcHeaders[k]}`).join("\n");

const lcAlgorithms = crypto
  .getHashes()
  .reduce(
    (acc, name) => Object.assign({}, acc, { [name.toLowerCase()]: name }),
    {}
  );

const normalizeAlgorithm = algorithm => lcAlgorithms[algorithm.toLowerCase()];

const normalizeHeaders = headers =>
  Object.entries(headers).reduce(
    (acc, [k, v]) => Object.assign({}, acc, { [k.toLowerCase()]: v }),
    {}
  );

// TODO: cache public keys
const getPublicKey = async ({ keyId }) => {
  const actor = await fetchJson(keyId);
  let publicKey = actor.publicKey;
  if (typeof actor.publicKey === "string") {
    publicKey = await fetchJson(publicKey);
  }
  // TODO: verify owner?
  return publicKey.publicKeyPem;
};

// Signature header parser adapted from:
// https://github.com/joyent/node-http-signature/blob/523e7c5a3a081e046813f62ab182e294a08eaf0d/lib/parser.js#L144
const ParamsState = {
  Name: 0,
  Quote: 1,
  Value: 2,
  Comma: 3,
};
const parseSigParts = authz => {
  function InvalidHeaderError(message) {
    return { message };
  }
  var i = 0;
  var state = ParamsState.Name;
  var tmpName = "";
  var tmpValue = "";

  var parsed = {};

  for (i = 0; i < authz.length; i++) {
    var c = authz.charAt(i);

    switch (Number(state)) {
      case ParamsState.Name:
        var code = c.charCodeAt(0);
        // restricted name of A-Z / a-z
        if (
          (code >= 0x41 && code <= 0x5a) || // A-Z
          (code >= 0x61 && code <= 0x7a)
        ) {
          // a-z
          tmpName += c;
        } else if (c === "=") {
          if (tmpName.length === 0)
            throw new InvalidHeaderError("bad param format 1");
          state = ParamsState.Quote;
        } else {
          throw new InvalidHeaderError("bad param format 2");
        }
        break;

      case ParamsState.Quote:
        if (c === '"') {
          tmpValue = "";
          state = ParamsState.Value;
        } else {
          throw new InvalidHeaderError("bad param format 3");
        }
        break;

      case ParamsState.Value:
        if (c === '"') {
          parsed[tmpName] = tmpValue;
          state = ParamsState.Comma;
        } else {
          tmpValue += c;
        }
        break;

      case ParamsState.Comma:
        if (c === ",") {
          tmpName = "";
          state = ParamsState.Name;
        } else {
          throw new InvalidHeaderError("bad param format 4");
        }
        break;

      default:
        throw new Error("Invalid state");
    }
  }

  return parsed;
};

module.exports = {
  signRequest,
  verifyRequest,
  parseSigParts,
  getPublicKey,
};
