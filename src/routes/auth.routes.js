const express = require("express");
const { getAccessToken } = require("../shopware/auth.service");

const router = express.Router();

router.get("/auth/token", async (req, res) => {
  const tokenData = await getAccessToken();

  res.status(200).json({
    success: true,
    data: tokenData
  });
});

module.exports = router;