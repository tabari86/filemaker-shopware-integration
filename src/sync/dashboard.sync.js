const { syncProducts } = require("./product.sync");
const { syncOrders } = require("./order.sync");
const { createSyncLog } = require("../filemaker/sync-log.repository");

async function runDashboardSync() {
  const startedAt = new Date();

  try {
    const productResult = await syncProducts();
    const orderResult = await syncOrders();
    const finishedAt = new Date();

    await createSyncLog({
      entity: "dashboard",
      direction: "shopware-to-filemaker-simulation",
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
      trigger: "filemaker-style-dashboard",
      mode: "mock",
      startedAt,
      finishedAt,
      results: {
        products: productResult,
        orders: orderResult
      }
    };
  } catch (error) {
    await createSyncLog({
      entity: "dashboard",
      direction: "shopware-to-filemaker-simulation",
      status: "failure",
      savedCount: 0,
      startedAt,
      finishedAt: new Date(),
      mode: "mock",
      details: { message: "Dashboard synchronization failed" }
    }).catch(() => {});

    throw error;
  }
}

module.exports = {
  runDashboardSync
};
