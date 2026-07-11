const mongoose = require("mongoose");

const syncLogSchema = new mongoose.Schema(
  {
    entity: {
      type: String,
      required: true,
      enum: ["products", "orders", "dashboard"]
    },
    direction: { type: String, required: true },
    status: { type: String, required: true, enum: ["success", "failure"] },
    savedCount: { type: Number, required: true, min: 0 },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, required: true },
    mode: { type: String, required: true },
    details: mongoose.Schema.Types.Mixed
  },
  { timestamps: true, versionKey: false }
);

syncLogSchema.index({ entity: 1, createdAt: -1 });

module.exports = mongoose.model("SyncLog", syncLogSchema);
