const express = require("express");
const { fetchProducts } = require("../shopware/product.service");
const { syncProducts } = require("../sync/product.sync");

const router = express.Router();

router.get("/products", async (req, res) => {
  const products = await fetchProducts();

  res.status(200).json({
    success: true,
    count: products.length,
    data: products
  });
});

router.post("/products/sync", async (req, res) => {
  const result = await syncProducts();

  res.status(200).json({
    success: true,
    message: "Products synchronized successfully",
    data: result
  });
});

module.exports = router;