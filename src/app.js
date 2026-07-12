const express = require("express");
const config = require("./config/env");
const requestId = require("./middleware/request-id.middleware");

const app = express();

app.disable("x-powered-by");
app.use(requestId);
app.use(express.json({ limit: "100kb" }));

app.get("/", (req, res) => {
  res.json({
    success: true,
    requestId: req.requestId,
    data: {
      project: config.serviceName,
      status: "running",
      version: config.version,
      apiVersion: "v1",
      sourceMode: "simulated-shopware",
      persistence: "mongodb"
    }
  });
});

app.use("/api", require("./routes/health.routes"));
app.use(require("./routes/docs.routes"));
app.use("/api/v1", require("./routes/v1.routes"));
app.use(require("./middleware/not-found.middleware"));
app.use(require("./middleware/error.middleware"));

module.exports = app;
