const express = require("express");
const { runDashboardSync } = require("../sync/dashboard.sync");

const router = express.Router();

router.post("/sync/all", async (req, res) => {
  const result = await runDashboardSync();

  res.status(200).json({
    success: true,
    message: "Dashboard synchronization completed",
    data: result
  });
});

module.exports = router;