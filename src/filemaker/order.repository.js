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

function buildOrderFilter(options) {
  const filter = {};

  if (options.orderNumber !== undefined) {
    filter.orderNumber = options.orderNumber;
  }
  if (options.status !== undefined) filter.status = options.status;
  if (options.from !== undefined || options.to !== undefined) {
    filter.orderDate = {};
    if (options.from !== undefined) filter.orderDate.$gte = options.from;
    if (options.to !== undefined) filter.orderDate.$lte = options.to;
  }

  return filter;
}

function buildSort(sort) {
  const selected = sort || { field: "orderDate", direction: -1 };
  return { [selected.field]: selected.direction, _id: selected.direction };
}

async function readOrders(options = {}) {
  const page = options.page ?? 1;
  const limit = options.limit ?? 25;
  const filter = buildOrderFilter(options);

  const [items, total] = await Promise.all([
    Order.find(filter)
      .sort(buildSort(options.sort))
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Order.countDocuments(filter)
  ]);

  return { items, total };
}

async function findOrderByOrderNumber(orderNumber) {
  return Order.findOne({ orderNumber }).lean();
}

module.exports = {
  findOrderByOrderNumber,
  readOrders,
  saveOrders
};
