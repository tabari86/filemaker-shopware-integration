const Order = require("../models/order.model");
async function saveOrders(orders) {
  if (orders.length === 0) return 0;

  await Promise.all(
    orders.map((order) => new Order(order).validate())
  );

  const operations = orders.map((order) => ({
    updateOne: {
      filter: { shopwareId: order.shopwareId },
      update: { $set: order },
      upsert: true
    }
  }));

  await Order.bulkWrite(operations, { ordered: false });
  return orders.length;
}

async function readOrders(limit = 25) {
  const boundedLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
  return Order.find()
    .sort({ orderDate: -1, orderNumber: -1 })
    .limit(boundedLimit)
    .lean();
}

module.exports = { saveOrders, readOrders };
