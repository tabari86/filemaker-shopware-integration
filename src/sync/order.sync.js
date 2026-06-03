const { fetchOrders } = require("../shopware/order.service");
const { mapShopwareOrderToFileMaker } = require("./order.mapper");
const { saveOrders } = require("../filemaker/order.repository");

async function syncOrders() {
  const shopwareOrders = await fetchOrders();

  const fileMakerOrders = shopwareOrders.map(
    mapShopwareOrderToFileMaker
  );

  const savedCount = await saveOrders(fileMakerOrders);

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