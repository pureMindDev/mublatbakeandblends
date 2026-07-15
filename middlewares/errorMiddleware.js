const ApiError = require("../utils/ApiError");

/* Global error handler — must have 4 params for Express to recognise it */
const errorHandler = (err, req, res, next) => {
  /* Already an ApiError */
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      type:    "error",
      message: err.message,
      errors:  err.errors.length ? err.errors : undefined,
    });
  }

  /* Mongoose validation error */
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      type:    "error",
      message: "Validation failed",
      errors,
    });
  }

  /* Mongoose duplicate key */
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      type:    "error",
      message: `${field} already exists`,
    });
  }

  /* JWT errors */
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ type: "error", message: "Invalid token" });
  }
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({ type: "error", message: "Token expired, please log in again" });
  }

  /* Mongoose bad ObjectId */
  if (err.name === "CastError") {
    return res.status(400).json({ type: "error", message: `Invalid ${err.path}: ${err.value}` });
  }

  /* Fallback */
  console.error("Unhandled error:", err);
  res.status(500).json({
    type:    "error",
    message: process.env.NODE_ENV === "development" ? err.message : "Something went wrong",
  });
};

module.exports = errorHandler;
