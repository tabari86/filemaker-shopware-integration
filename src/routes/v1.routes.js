const express = require("express");
const apiKey = require("../middleware/api-key.middleware");

const router = express.Router();

router.use(apiKey);
router.use(require("./product.routes"));
router.use(require("./order.routes"));
router.use(require("./sync.routes"));

module.exports = router;
