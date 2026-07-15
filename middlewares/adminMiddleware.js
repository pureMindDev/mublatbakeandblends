const ApiError = require("../utils/ApiError");

/**
 * Use AFTER protect middleware.
 * Ensures the authenticated user has the admin role.
 *
 * Usage:
 *   router.post("/", protect, adminOnly, createProduct);
 */
const adminOnly = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  throw ApiError.forbidden("Admin access required");
};

module.exports = adminOnly;
