const express = require("express");
const { fetchOrders, updateOrderStatus } = require("../shopware/order.service");
const { syncOrders } = require("../sync/order.sync");

const router = express.Router();

router.get("/orders", async (req, res) => {
  const orders = await fetchOrders();

  res.status(200).json({
    success: true,
    count: orders.length,
    data: orders
  });
});

router.post("/orders/sync", async (req, res) => {
  const result = await syncOrders();

  res.status(200).json({
    success: true,
    message: "Orders synchronized successfully",
    data: result
  });
});

router.patch("/orders/:orderNumber/status", async (req, res) => {
  const { orderNumber } = req.params;
  const { status } = req.body;

  const result = await updateOrderStatus(orderNumber, status);

  res.status(200).json({
    success: true,
    message: "Order status update processed",
    data: result
  });
});

module.exports = router;