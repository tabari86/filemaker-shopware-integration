const Product = require("../models/product.model");
async function saveProducts(products) {
  if (products.length === 0) return 0;

  await Promise.all(
    products.map((product) => new Product(product).validate())
  );

  const operations = products.map((product) => ({
    updateOne: {
      filter: { shopwareId: product.shopwareId },
      update: { $set: product },
      upsert: true
    }
  }));

  await Product.bulkWrite(operations, { ordered: false });
  return products.length;
}

async function readProducts(limit = 25) {
  const boundedLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
  return Product.find().sort({ productNumber: 1 }).limit(boundedLimit).lean();
}

module.exports = { saveProducts, readProducts };
