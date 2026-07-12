const { ApiError } = require("../utils/api-error");

function classifyError(error) {
  if (error instanceof ApiError) {
    return { status: error.status, code: error.code, message: error.message };
  }

  if (error?.type === "entity.parse.failed") {
    return {
      status: 400,
      code: "INVALID_QUERY",
      message: "Malformed JSON request body"
    };
  }

  if (error?.type === "entity.too.large") {
    return {
      status: 413,
      code: "PAYLOAD_TOO_LARGE",
      message: "Request body exceeds the 100kb limit"
    };
  }

  if (error instanceof URIError) {
    return {
      status: 400,
      code: "INVALID_IDENTIFIER",
      message: "Request path contains an invalid identifier"
    };
  }

  if (
    error?.type === "charset.unsupported" ||
    error?.type === "encoding.unsupported"
  ) {
    return {
      status: 415,
      code: "UNSUPPORTED_MEDIA_TYPE",
      message: "Request content encoding or charset is not supported"
    };
  }

  if (
    Number.isInteger(error?.status) &&
    error.status >= 400 &&
    error.status < 500
  ) {
    return {
      status: error.status,
      code: "INVALID_REQUEST",
      message: "Invalid request"
    };
  }

  return {
    status: 500,
    code: "INTERNAL_ERROR",
    message: "Internal server error"
  };
}

module.exports = (error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const { status, code, message } = classifyError(error);

  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status,
      code,
      message
    })
  );

  return res.status(status).json({
    success: false,
    error: { code, message, requestId: req.requestId }
  });
};
