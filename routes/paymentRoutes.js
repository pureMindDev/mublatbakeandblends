const express = require("express");
const router  = express.Router();

const {
  createPaymentIntent,
  confirmPayment,
  stripeWebhook,
} = require("../controllers/paymentController");

router.post("/create-intent",               createPaymentIntent);
router.post("/confirm",                     confirmPayment);
router.post("/webhook", express.raw({ type: "application/json" }), stripeWebhook);

module.exports = router;