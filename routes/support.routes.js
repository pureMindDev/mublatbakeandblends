const express = require("express");
const router  = express.Router();
const { submitSupportMessage } = require("../controllers/supportController");

// POST /api/support — public, no auth needed
router.post("/", submitSupportMessage);

module.exports = router;
