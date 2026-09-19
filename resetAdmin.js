/**
 * Deletes every existing admin account and creates a fresh one.
 *
 * Usage:
 *   1. Edit NEW_ADMIN below with the email/password you want.
 *   2. From the /server folder run:  node resetAdmin.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

const User = require("./models/User");

// ── Edit these before running ──
const NEW_ADMIN = {
  name: "Admin",
  email: "your-new-email@example.com",
  password: "choose-a-strong-password",
};
// ────────────────────────────────

mongoose.connect(process.env.MONGO_URI);

const resetAdmin = async () => {
  try {
    const { deletedCount } = await User.deleteMany({ role: "admin" });
    console.log(`🗑️  Removed ${deletedCount} existing admin account(s).`);

    /* Use User.create so the pre-save hook hashes the password */
    await User.create(NEW_ADMIN);

    console.log("✅ New admin created successfully.");
    console.log("   Email:    " + NEW_ADMIN.email);
    console.log("   Password: " + NEW_ADMIN.password);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error resetting admin:", err.message);
    process.exit(1);
  }
};

resetAdmin();
