const express = require("express");
const config = require("./config/env");

const app = express();

app.disable("x-powered-by");
app.use(express.json({ limit: "100kb" }));

app.get("/", (req, res) => {
  res.json({
    project: config.serviceName,
    status: "running",
    version: config.version,
    sourceMode: "simulated Shopware",
    persistence: "MongoDB"
  });
});

app.use("/api", require("./routes/health.routes"));
app.use(
  "/api",
  require("./routes/product.routes"),
  require("./routes/order.routes"),
  require("./routes/sync.routes")
);
app.use(require("./middleware/not-found.middleware"));
app.use(require("./middleware/error.middleware"));

module.exports = app;
