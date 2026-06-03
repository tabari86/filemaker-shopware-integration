const { syncProducts } = require("./product.sync");
const { syncOrders } = require("./order.sync");

async function runDashboardSync() {
  const startedAt = new Date().toISOString();

  const productResult = await syncProducts();
  const orderResult = await syncOrders();

  const finishedAt = new Date().toISOString();

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