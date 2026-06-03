const fs = require("fs/promises");
const path = require("path");

const PRODUCTS_FILE = path.join(
  __dirname,
  "../../data/products/products.json"
);

async function saveProducts(products) {
  await fs.writeFile(
    PRODUCTS_FILE,
    JSON.stringify(products, null, 2),
    "utf-8"
  );

  return products.length;
}

module.exports = {
  saveProducts
};