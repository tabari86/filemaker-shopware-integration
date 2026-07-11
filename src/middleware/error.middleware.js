module.exports = (error, req, res, next) => {
  const safeStatus =
    Number.isInteger(error.status) && error.status >= 400 && error.status < 600
      ? error.status
      : error.type === "entity.parse.failed"
        ? 400
        : 500;
  const safeMessage =
    safeStatus >= 500 ? "Internal server error" : error.message;

  console.error(
    `${new Date().toISOString()} ${req.method} ${req.path}: ${safeMessage}`
  );

  res.status(safeStatus).json({
    success: false,
    error: { message: safeMessage }
  });
};
