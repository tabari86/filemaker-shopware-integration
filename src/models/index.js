const Product = require("./product.model");
const Order = require("./order.model");
const SyncLog = require("./sync-log.model");

async function initializeIndexes() {
  await Promise.all([Product.init(), Order.init(), SyncLog.init()]);
}

module.exports = { Product, Order, SyncLog, initializeIndexes };
