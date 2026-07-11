const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    shopwareId: { type: String, required: true, unique: true },
    productNumber: { type: String, required: true, unique: true },
    productName: { type: String, required: true },
    stockQuantity: { type: Number, required: true, min: 0 },
    isActive: { type: Boolean, required: true },
    netPrice: { type: Number, required: true, min: 0 },
    grossPrice: { type: Number, required: true, min: 0 },
    syncedAt: { type: Date, required: true }
  },
  { timestamps: true, versionKey: false }
);

module.exports = mongoose.model("Product", productSchema);
