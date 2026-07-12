const crypto = require("crypto");

const SAFE_REQUEST_ID = /^[A-Za-z0-9_.:-]{1,100}$/;

module.exports = (req, res, next) => {
  const supplied = req.get("x-request-id");
  const requestId =
    typeof supplied === "string" && SAFE_REQUEST_ID.test(supplied)
      ? supplied
      : crypto.randomUUID();

  req.requestId = requestId;
  res.set("x-request-id", requestId);
  next();
};
