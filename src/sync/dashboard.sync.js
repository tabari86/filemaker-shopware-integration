const { syncProducts } = require("./product.sync");
const { syncOrders } = require("./order.sync");
const { createSyncLog } = require("../filemaker/sync-log.repository");

async function runDashboardSync() {
  const startedAt = new Date().toISOString();

  const productResult = await syncProducts();
  const orderResult = await syncOrders();

  const finishedAt = new Date().toISOString();

  await createSyncLog({
    entity: "dashboard",
    direction: "dashboard-triggered-sync",
    status: "success",
    savedCount: productResult.savedCount + orderResult.savedCount,
    startedAt,
    finishedAt,
    mode: "mock",
    details: {
      products: productResult.savedCount,
      orders: orderResult.savedCount
    }
  });

  return {
    trigger: "filemaker-dashboard-script",
    mode: "bi-directional-sync-simulation",
    startedAt,
    finishedAt,
    results: {
      products: productResult,
      orders: orderResult
    }
  };
}

module.exports = {
  runDashboardSync
};