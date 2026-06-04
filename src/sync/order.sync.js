const { fetchOrders } = require("../shopware/order.service");
const { mapShopwareOrderToFileMaker } = require("./order.mapper");
const { saveOrders } = require("../filemaker/order.repository");
const { createSyncLog } = require("../filemaker/sync-log.repository");

async function syncOrders() {
  const startedAt = new Date().toISOString();

  const shopwareOrders = await fetchOrders();

  const fileMakerOrders = shopwareOrders.map(
    mapShopwareOrderToFileMaker
  );

  const savedCount = await saveOrders(fileMakerOrders);

  const finishedAt = new Date().toISOString();

  await createSyncLog({
    entity: "orders",
    direction: "shopware-to-filemaker",
    status: "success",
    savedCount,
    startedAt,
    finishedAt,
    mode: "mock"
  });

  return {
    entity: "orders",
    direction: "shopware-to-filemaker",
    source: "shopware",
    target: "filemaker-simulation",
    savedCount
  };
}

module.exports = {
  syncOrders
};