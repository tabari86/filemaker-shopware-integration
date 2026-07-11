const express = require("express");
const config = require("../config/env");
const { pingDatabase } = require("../config/database");

const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: config.serviceName,
    version: config.version,
    timestamp: new Date().toISOString()
  });
});

router.get("/ready", async (req, res) => {
  try {
    await pingDatabase();
    res.status(200).json({
      status: "ready",
      service: config.serviceName,
      timestamp: new Date().toISOString()
    });
  } catch {
    res.status(503).json({
      status: "not-ready",
      service: config.serviceName,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;
