const jwt  = require("jsonwebtoken");
const User = require("../models/User");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw ApiError.unauthorized("No token provided");
  }

  const token = authHeader.split(" ")[1];

  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const user = await User.findById(decoded.id).select("-password");

  if (!user) {
    throw ApiError.unauthorized("User belonging to this token no longer exists");
  }

  req.user = user;
  next();
});

module.exports = protect;
