const Product = require("./product.model");
const Order = require("./order.model");
const SyncLog = require("./sync-log.model");
const SyncRun = require("./sync-run.model");

async function initializeIndexes() {
  await Promise.all([
    Product.init(),
    Order.init(),
    SyncLog.init(),
    SyncRun.init()
  ]);
}

module.exports = { Product, Order, SyncLog, SyncRun, initializeIndexes };
