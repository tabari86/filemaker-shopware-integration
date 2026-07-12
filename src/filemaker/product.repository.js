const Product = require("../models/product.model");
const { escapeRegex } = require("../utils/query-options");

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

function buildProductFilter(options) {
  const filter = {};

  if (options.productNumber !== undefined) {
    filter.productNumber = options.productNumber;
  }
  if (options.name !== undefined) {
    filter.productName = {
      $regex: escapeRegex(options.name),
      $options: "i"
    };
  }
  if (options.isActive !== undefined) filter.isActive = options.isActive;
  if (options.minStock !== undefined) {
    filter.stockQuantity = { $gte: options.minStock };
  }

  return filter;
}

function buildSort(sort) {
  const selected = sort || { field: "syncedAt", direction: -1 };
  return { [selected.field]: selected.direction, _id: selected.direction };
}

async function readProducts(options = {}) {
  const page = options.page ?? 1;
  const limit = options.limit ?? 25;
  const filter = buildProductFilter(options);

  const [items, total] = await Promise.all([
    Product.find(filter)
      .sort(buildSort(options.sort))
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Product.countDocuments(filter)
  ]);

  return { items, total };
}

async function findProductByProductNumber(productNumber) {
  return Product.findOne({ productNumber }).lean();
}

module.exports = {
  findProductByProductNumber,
  readProducts,
  saveProducts
};
