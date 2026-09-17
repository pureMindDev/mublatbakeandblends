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

  body("items.*.name")
    .trim()
    .notEmpty().withMessage("Each item must have a name"),

  body("items.*.quantity")
    .isInt({ min: 1 }).withMessage("Item quantity must be at least 1"),

  body("items.*.price")
    .isFloat({ min: 0 }).withMessage("Item price must be a non-negative number"),

  body("totalAmount")
    .isFloat({ min: 0 }).withMessage("Total amount must be a non-negative number"),

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

module.exports = { orderValidation, updateStatusValidation, updatePaymentValidation };
