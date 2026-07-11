const express = require("express");
const { readProducts } = require("../filemaker/product.repository");
const { syncProducts } = require("../sync/product.sync");
const apiKey = require("../middleware/api-key.middleware");

const router = express.Router();

function parseLimit(value) {
  if (value === undefined) return 25;

  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 100) {
    const error = new Error("limit must be an integer from 1 to 100");
    error.status = 400;
    throw error;
  }

  return Number(value);
}

router.get("/products", apiKey, async (req, res) => {
  const products = await readProducts(parseLimit(req.query.limit));

  res.status(200).json({
    success: true,
    count: products.length,
    data: products
  });
});

router.post("/products/sync", apiKey, async (req, res) => {
  const result = await syncProducts();

  res.status(200).json({
    success: true,
    message: "Products synchronized successfully",
    data: result
  });
});

module.exports = router;
