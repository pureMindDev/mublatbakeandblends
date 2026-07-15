const asyncHandler       = require("../utils/asyncHandler");
const ApiError           = require("../utils/ApiError");
const { sendSupportEmail } = require("../services/emailService");

/**
 * POST /api/support
 * Public — receives the contact form and emails it to admin.
 */
const submitSupportMessage = asyncHandler(async (req, res) => {
  const { name, email, topic, message } = req.body;

  if (!name || !email || !topic || !message) {
    throw ApiError.badRequest("All fields (name, email, topic, message) are required.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw ApiError.badRequest("Invalid email address.");
  }

  if (message.trim().length < 20) {
    throw ApiError.badRequest("Message must be at least 20 characters.");
  }

  await sendSupportEmail({ name: name.trim(), email: email.trim(), topic, message: message.trim() });

  res.json({ type: "success", message: "Your message has been sent. We'll be in touch soon!" });
});

module.exports = { submitSupportMessage };
