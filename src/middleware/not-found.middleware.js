module.exports = (req, res) => {
  res.status(404).json({
    success: false,
    error: { message: "Route not found" }
  });
};
