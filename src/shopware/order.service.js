async function fetchOrders() {
  return [
    {
      id: "sw-order-5001",
      orderNumber: "ORD-2026-001",
      orderDate: "2026-06-03",
      amountTotal: 89.90,
      amountNet: 75.55,
      status: "open",
      customer: {
        id: "cust-1001",
        firstName: "Anna",
        lastName: "Schneider",
        email: "anna.schneider@example.com"
      },
      lineItems: [
        {
          id: "line-1",
          productNumber: "BOOK-001",
          label: "API Design Fundamentals",
          quantity: 2,
          unitPrice: 29.74,
          totalPrice: 59.48
        },
        {
          id: "line-2",
          productNumber: "BOOK-002",
          label: "Modern E-Commerce Integration",
          quantity: 1,
          unitPrice: 30.42,
          totalPrice: 30.42
        }
      ]
    }
  ];
}

module.exports = {
  fetchOrders
};
