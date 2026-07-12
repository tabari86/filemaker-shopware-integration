const express = require("express");
const {
  readProducts,
  findProductByProductNumber
} = require("../filemaker/product.repository");
const { runProductSync } = require("../sync/product.sync");
const {
  parseProductQuery,
  parseIdentifier,
  buildPagination
} = require("../utils/query-options");
const { ApiError } = require("../utils/api-error");

const router = express.Router();

router.get("/products", async (req, res) => {
  const options = parseProductQuery(req.query);
  const { items, total } = await readProducts(options);

  res.status(200).json({
    success: true,
    requestId: req.requestId,
    data: items,
    pagination: buildPagination(options.page, options.limit, total)
  });
});

router.get("/products/:productNumber", async (req, res) => {
  const productNumber = parseIdentifier(
    req.params.productNumber,
    "productNumber"
  );
  const product = await findProductByProductNumber(productNumber);

  if (!product) {
    throw new ApiError(404, "PRODUCT_NOT_FOUND", "Product not found");
  }

  res.status(200).json({
    success: true,
    requestId: req.requestId,
    data: product
  });
});

router.post("/sync/products", async (req, res) => {
  const result = await runProductSync({ requestId: req.requestId });

  res.status(200).json({
    success: true,
    requestId: req.requestId,
    data: result
  });
});

module.exports = router;
