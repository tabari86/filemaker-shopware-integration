const mongoose = require("mongoose");

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
    runId: { type: String, required: true, match: UUID_PATTERN },
    requestId: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100
    },
    trigger: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100
    },
    startedAt: { type: Date, required: true },
    finishedAt: { type: Date, required: true },
    durationMs: { type: Number, required: true, min: 0 },
    mode: { type: String, required: true },
    details: mongoose.Schema.Types.Mixed
  },
  { timestamps: true, versionKey: false }
);

syncLogSchema.index({ createdAt: -1 });
syncLogSchema.index({ entity: 1, createdAt: -1 });
syncLogSchema.index({ status: 1, createdAt: -1 });
syncLogSchema.index({ entity: 1, status: 1, createdAt: -1 });
syncLogSchema.index({ runId: 1, createdAt: 1 });

module.exports = mongoose.model("SyncLog", syncLogSchema);
