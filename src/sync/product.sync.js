const { fetchProducts } = require("../shopware/product.service");
const { mapShopwareProductToFileMaker } = require("./product.mapper");
const { saveProducts } = require("../filemaker/product.repository");
const { createSyncLog } = require("../filemaker/sync-log.repository");

async function syncProducts() {
  const startedAt = new Date();

  try {
    const shopwareProducts = await fetchProducts();
    const fileMakerProducts = shopwareProducts.map(
      mapShopwareProductToFileMaker
    );
    const savedCount = await saveProducts(fileMakerProducts);
    const finishedAt = new Date();

    await createSyncLog({
      entity: "products",
      direction: "shopware-to-filemaker-simulation",
      status: "success",
      savedCount,
      startedAt,
      finishedAt,
      mode: "mock"
    });

    return {
      entity: "products",
      direction: "shopware-to-filemaker-simulation",
      source: "simulated-shopware",
      target: "mongodb-backed-filemaker-simulation",
      mode: "mock",
      savedCount
    };
  } catch (error) {
    await createSyncLog({
      entity: "products",
      direction: "shopware-to-filemaker-simulation",
      status: "failure",
      savedCount: 0,
      startedAt,
      finishedAt: new Date(),
      mode: "mock",
      details: { message: "Product synchronization failed" }
    }).catch(() => {});

    throw error;
  }
}

module.exports = {
  syncProducts
};
