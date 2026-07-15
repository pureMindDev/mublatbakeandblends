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

const loginValidation = [
  body("email")
    .isEmail().withMessage("Enter a valid email address")
    .normalizeEmail(),
  body("password")
    .notEmpty().withMessage("Password is required"),
  handleValidationErrors,
];

module.exports = { loginValidation };
