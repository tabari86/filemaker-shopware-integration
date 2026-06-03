const fs = require("fs/promises");
const path = require("path");

const ORDERS_FILE = path.join(
  __dirname,
  "../../data/orders/orders.json"
);

async function saveOrders(orders) {
  await fs.writeFile(
    ORDERS_FILE,
    JSON.stringify(orders, null, 2),
    "utf-8"
  );

  return orders.length;
}

module.exports = {
  saveOrders
};