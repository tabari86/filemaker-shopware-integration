const { fetchOrders } = require("../shopware/order.service");
const { mapShopwareOrderToFileMaker } = require("./order.mapper");
const { saveOrders } = require("../filemaker/order.repository");
const { createSyncLog } = require("../filemaker/sync-log.repository");

async function syncOrders() {
  const startedAt = new Date();

  try {
    const shopwareOrders = await fetchOrders();
    const fileMakerOrders = shopwareOrders.map(
      mapShopwareOrderToFileMaker
    );
    const savedCount = await saveOrders(fileMakerOrders);
    const finishedAt = new Date();

    await createSyncLog({
      entity: "orders",
      direction: "shopware-to-filemaker-simulation",
      status: "success",
      savedCount,
      startedAt,
      finishedAt,
      mode: "mock"
    });

    return {
      entity: "orders",
      direction: "shopware-to-filemaker-simulation",
      source: "simulated-shopware",
      target: "mongodb-backed-filemaker-simulation",
      mode: "mock",
      savedCount
    };
  } catch (error) {
    await createSyncLog({
      entity: "orders",
      direction: "shopware-to-filemaker-simulation",
      status: "failure",
      savedCount: 0,
      startedAt,
      finishedAt: new Date(),
      mode: "mock",
      details: { message: "Order synchronization failed" }
    }).catch(() => {});

    throw error;
  }
}

module.exports = {
  syncOrders
};
