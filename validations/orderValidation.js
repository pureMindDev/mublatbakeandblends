const { body, validationResult } = require("express-validator");

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      type:    "error",
      message: "Validation failed",
      errors:  errors.array().map((e) => e.msg),
    });
  }
  next();
};

const orderValidation = [
  body("customerName")
    .trim()
    .notEmpty().withMessage("Customer name is required"),

  body("phone")
    .trim()
    .notEmpty().withMessage("Phone number is required")
    .matches(/^[\d\s+\-()]{7,}$/).withMessage("Enter a valid phone number"),

  body("method")
    .isIn(["Delivery", "Pickup"]).withMessage("Method must be Delivery or Pickup"),

  body("address")
    .if(body("method").equals("Delivery"))
    .trim()
    .notEmpty().withMessage("Delivery address is required"),

  body("items")
    .isArray({ min: 1 }).withMessage("Order must contain at least one item"),

  // Prices and totals are NOT validated because they are NOT trusted: the
  // server recalculates them (see services/pricingService.js).
  body("items.*.quantity")
    .isInt({ min: 1, max: 100 }).withMessage("Item quantity must be a whole number from 1 to 100"),

  handleValidationErrors,
];

// Public price preview used by the cart and checkout.
const quoteValidation = [
  body("method")
    .isIn(["Delivery", "Pickup"]).withMessage("Method must be Delivery or Pickup"),
  body("items")
    .isArray({ min: 1, max: 50 }).withMessage("Basket must contain at least one item"),
  body("items.*.quantity")
    .isInt({ min: 1, max: 100 }).withMessage("Item quantity must be a whole number from 1 to 100"),
  handleValidationErrors,
];

const updateStatusValidation = [
  body("status")
    .isIn(["Pending", "Preparing", "Out for Delivery", "Delivered", "Cancelled"])
    .withMessage("Invalid order status"),
  handleValidationErrors,
];

// Admin-only: confirming a bank transfer. Only "Paid" is accepted here —
// see order.controller.updateOrderPayment for why reverting isn't exposed.
const updatePaymentValidation = [
  body("paymentStatus")
    .equals("Paid")
    .withMessage('paymentStatus must be "Paid"'),
  handleValidationErrors,
];

module.exports = { orderValidation, quoteValidation, updateStatusValidation, updatePaymentValidation };
