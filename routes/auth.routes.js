const express = require("express");
const router  = express.Router();

const { login, getMe }    = require("../controllers/auth.controller");
const { loginValidation } = require("../validations/authValidation");
const protect             = require("../middlewares/auth.middleware");

router.post("/login",  loginValidation, login);
router.get("/profile", protect, getMe);
router.get("/me",      protect, getMe); // Fix: AuthContext calls /me not /profile

module.exports = router;
