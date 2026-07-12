const express = require("express");
const {
  readOrders,
  findOrderByOrderNumber
} = require("../filemaker/order.repository");
const { runOrderSync } = require("../sync/order.sync");
const {
  parseOrderQuery,
  parseIdentifier,
  buildPagination
} = require("../utils/query-options");
const { ApiError } = require("../utils/api-error");

const router = express.Router();

router.get("/orders", async (req, res) => {
  const options = parseOrderQuery(req.query);
  const { items, total } = await readOrders(options);

  res.status(200).json({
    success: true,
    requestId: req.requestId,
    data: items,
    pagination: buildPagination(options.page, options.limit, total)
  });
});

router.get("/orders/:orderNumber", async (req, res) => {
  const orderNumber = parseIdentifier(req.params.orderNumber, "orderNumber");
  const order = await findOrderByOrderNumber(orderNumber);

  if (!order) {
    throw new ApiError(404, "ORDER_NOT_FOUND", "Order not found");
  }

  res.status(200).json({
    success: true,
    requestId: req.requestId,
    data: order
  });
});

router.post("/sync/orders", async (req, res) => {
  const result = await runOrderSync({ requestId: req.requestId });

  res.status(200).json({
    success: true,
    requestId: req.requestId,
    data: result
  });
});

module.exports = router;
