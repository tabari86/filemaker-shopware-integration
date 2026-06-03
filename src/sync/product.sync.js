const { fetchProducts } = require("../shopware/product.service");
const { mapShopwareProductToFileMaker } = require("./product.mapper");
const { saveProducts } = require("../filemaker/product.repository");

async function syncProducts() {
  const shopwareProducts = await fetchProducts();

  const fileMakerProducts = shopwareProducts.map(
    mapShopwareProductToFileMaker
  );

  const savedCount = await saveProducts(fileMakerProducts);

  return {
    entity: "products",
    source: "shopware",
    target: "filemaker-simulation",
    savedCount
  };
}

module.exports = {
  syncProducts
};