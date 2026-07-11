async function fetchProducts() {
  return [
    {
      id: "sw-prod-1001",
      productNumber: "BOOK-001",
      name: "API Design Fundamentals",
      stock: 42,
      active: true,
      price: {
        net: 24.99,
        gross: 29.74
      }
    },
    {
      id: "sw-prod-1002",
      productNumber: "BOOK-002",
      name: "Modern E-Commerce Integration",
      stock: 18,
      active: true,
      price: {
        net: 34.99,
        gross: 41.64
      }
    }
  ];
}

module.exports = {
  fetchProducts
};
