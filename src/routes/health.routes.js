const express = require("express");

const router = express.Router();

router.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    service: "filemaker-shopware-integration",
    version: "1.0.0",
    timestamp: new Date().toISOString()
  });
});

router.get("/sync-status", (req, res) => {
  res.status(200).json({
    products: "not synchronized",
    orders: "not synchronized",
    inventory: "not synchronized"
  });
});

module.exports = router;