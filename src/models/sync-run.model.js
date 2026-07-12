const crypto = require("crypto");
const mongoose = require("mongoose");

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const summarySchema = new mongoose.Schema(
  {
    products: { type: Number, required: true, min: 0 },
    orders: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const syncRunSchema = new mongoose.Schema(
  {
    runId: {
      type: String,
      required: true,
      unique: true,
      immutable: true,
      match: UUID_PATTERN,
      default: () => crypto.randomUUID()
    },
    requestId: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100
    },
    scope: {
      type: String,
      required: true,
      enum: ["products", "orders", "all"]
    },
    trigger: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100
    },
    status: {
      type: String,
      required: true,
      enum: ["running", "success", "failure"],
      default: "running"
    },
    startedAt: { type: Date, required: true, default: Date.now },
    finishedAt: { type: Date, default: null },
    durationMs: { type: Number, min: 0, default: null },
    summary: { type: summarySchema, default: null },
    error: { type: String, trim: true, maxlength: 100, default: null }
  },
  { timestamps: true, versionKey: false }
);

syncRunSchema.index({ scope: 1, startedAt: -1 });
syncRunSchema.index({ status: 1, startedAt: -1 });
syncRunSchema.index({ startedAt: -1 });

module.exports = mongoose.model("SyncRun", syncRunSchema);
