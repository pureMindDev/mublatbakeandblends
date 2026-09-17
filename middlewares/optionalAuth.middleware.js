const jwt  = require("jsonwebtoken");
const User = require("../models/User");

/**
 * Like auth.middleware's `protect`, but never rejects the request.
 * If a valid Bearer token is present, req.user is populated (so downstream
 * code can check req.user?.role === "admin"). If it's missing or invalid,
 * the request just continues with req.user left undefined.
 *
 * Used on routes that are public but behave slightly differently for an
 * authenticated admin (e.g. POST /api/orders, used both by the public
 * checkout and by the admin dashboard's "Create Order" modal).
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("-password");
      if (user) req.user = user;
    }
  } catch (err) {
    // Invalid/expired token on a public route — ignore and proceed as a guest.
  }
  next();
};

module.exports = optionalAuth;
