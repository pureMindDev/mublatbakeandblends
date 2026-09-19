const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

/* POST /api/auth/login */
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const admin = await User.findOne({ email });

  if (!admin) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const match = await admin.matchPassword(password);

  if (!match) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  res.json({
    type: "success",
    message: "Login successful",
    token: generateToken(admin._id),
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    },
  });
});
/* GET /api/auth/me — get currently logged-in admin */
const getMe = asyncHandler(async (req, res) => {
  res.json({
    type: "success",
    admin: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
    },
  });
});

module.exports = { login, getMe };
