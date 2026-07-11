const crypto = require("crypto");
const config = require("../config/env");

module.exports = (req, res, next) => {
  const supplied = req.get("x-api-key") || "";
  const expected = config.apiKey;
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  const valid =
    suppliedBuffer.length === expectedBuffer.length &&
    suppliedBuffer.length > 0 &&
    crypto.timingSafeEqual(suppliedBuffer, expectedBuffer);

  if (!valid) {
    return res.status(401).json({
      success: false,
      error: { message: "Invalid or missing API key" }
    });
  }

  next();
};
