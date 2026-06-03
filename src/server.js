const healthRoutes = require("./routes/health.routes");
const express = require("express");
const dotenv = require("dotenv");
const config = require("./config/env");
const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");
const orderRoutes = require("./routes/order.routes");
const syncRoutes = require("./routes/sync.routes");

dotenv.config();

const app = express();

app.use(express.json());

const PORT = config.port;

app.get("/", (req, res) => {
  res.json({
    project: "FileMaker-Shopware Integration",
    status: "running",
    version: "1.0.0"
  });
});

app.use("/api", healthRoutes);

app.use("/api", authRoutes);

app.use("/api", productRoutes);

app.use("/api", syncRoutes);

app.use("/api", orderRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});