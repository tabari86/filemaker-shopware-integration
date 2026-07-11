const express = require("express");
const { readOrders } = require("../filemaker/order.repository");
const { syncOrders } = require("../sync/order.sync");
const apiKey = require("../middleware/api-key.middleware");

const router = express.Router();

function parseLimit(value) {
  if (value === undefined) return 25;

  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 100) {
    const error = new Error("limit must be an integer from 1 to 100");
    error.status = 400;
    throw error;
  }

  return Number(value);
}

router.get("/orders", apiKey, async (req, res) => {
  const orders = await readOrders(parseLimit(req.query.limit));

  res.status(200).json({
    success: true,
    count: orders.length,
    data: orders
  });
});

router.post("/orders/sync", apiKey, async (req, res) => {
  const result = await syncOrders();

  res.status(200).json({
    success: true,
    message: "Orders synchronized successfully",
    data: result
  });
});

module.exports = router;
