const { fetchProducts } = require("../shopware/product.service");
const { mapShopwareProductToFileMaker } = require("./product.mapper");
const { saveProducts } = require("../filemaker/product.repository");
const { createSyncLog } = require("../filemaker/sync-log.repository");

async function syncProducts() {
  const startedAt = new Date().toISOString();

  const shopwareProducts = await fetchProducts();

  const fileMakerProducts = shopwareProducts.map(
    mapShopwareProductToFileMaker
  );

  const savedCount = await saveProducts(fileMakerProducts);

  const finishedAt = new Date().toISOString();

  await createSyncLog({
    entity: "products",
    direction: "shopware-to-filemaker",
    status: "success",
    savedCount,
    startedAt,
    finishedAt,
    mode: "mock"
  });

  return {
    entity: "products",
    direction: "shopware-to-filemaker",
    source: "shopware",
    target: "filemaker-simulation",
    savedCount
  };
}

module.exports = {
  syncProducts
};