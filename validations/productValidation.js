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

const productValidation = [
  body("name")
    .trim()
    .notEmpty().withMessage("Product name is required")
    .isLength({ min: 2, max: 60 }).withMessage("Name must be 2–60 characters"),

  body("description")
    .trim()
    .notEmpty().withMessage("Description is required")
    .isLength({ max: 200 }).withMessage("Description cannot exceed 200 characters"),

  body("category")
    .isIn(["Pastries", "Drinks"]).withMessage("Category must be Pastries or Drinks"),

  body("options")
    .isArray({ min: 1 }).withMessage("At least one price option is required"),

  body("options.*.label")
    .trim()
    .notEmpty().withMessage("Each option must have a label"),

  body("options.*.price")
    .isFloat({ min: 0 }).withMessage("Each option price must be a non-negative number"),

  handleValidationErrors,
];

const updateProductValidation = [
  body("name").optional()
    .trim()
    .isLength({ min: 2, max: 60 }).withMessage("Name must be 2–60 characters"),

  body("description").optional()
    .trim()
    .isLength({ max: 200 }).withMessage("Description cannot exceed 200 characters"),

  body("category").optional()
    .isIn(["Pastries", "Drinks"]).withMessage("Category must be Pastries or Drinks"),

  body("options").optional()
    .isArray({ min: 1 }).withMessage("At least one price option is required"),

  body("options.*.label").optional()
    .trim()
    .notEmpty().withMessage("Each option must have a label"),

  body("options.*.price").optional()
    .isFloat({ min: 0 }).withMessage("Each option price must be a non-negative number"),

  handleValidationErrors,
];

module.exports = { productValidation, updateProductValidation };
