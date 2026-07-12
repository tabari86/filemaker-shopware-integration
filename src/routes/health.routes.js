const express = require("express");
const config = require("../config/env");
const { pingDatabase } = require("../config/database");
const { ApiError } = require("../utils/api-error");

const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    requestId: req.requestId,
    data: {
      status: "healthy",
      service: config.serviceName,
      version: config.version,
      timestamp: new Date().toISOString()
    }
  });
});

router.get("/ready", async (req, res, next) => {
  try {
    await pingDatabase();
    res.status(200).json({
      success: true,
      requestId: req.requestId,
      data: {
        status: "ready",
        service: config.serviceName,
        timestamp: new Date().toISOString()
      }
    });
  } catch {
    return next(
      new ApiError(503, "SERVICE_NOT_READY", "Service is not ready")
    );
  }
});

module.exports = router;
