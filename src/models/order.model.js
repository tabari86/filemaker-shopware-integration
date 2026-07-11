const mongoose = require("mongoose");

const lineItemSchema = new mongoose.Schema(
  {
    lineItemId: { type: String, required: true },
    productNumber: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    totalPrice: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    shopwareId: { type: String, required: true, unique: true },
    orderNumber: { type: String, required: true, unique: true },
    orderDate: { type: Date, required: true },
    amountTotal: { type: Number, required: true, min: 0 },
    amountNet: { type: Number, required: true, min: 0 },
    status: { type: String, required: true },
    customerId: { type: String, required: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    lineItems: { type: [lineItemSchema], required: true },
    syncedAt: { type: Date, required: true }
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Order", orderSchema);
