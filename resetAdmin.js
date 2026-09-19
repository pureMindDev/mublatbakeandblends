/**
 * Deletes every existing admin account and creates a fresh one, using the
 * credentials from your .env file (never hardcode a password in this file —
 * .env is gitignored, this script is not).
 *
 * Usage:
 *   1. In server/.env set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD.
 *   2. From the /server folder run:  node resetAdmin.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

const User = require("./models/User");

const NEW_ADMIN = {
  name: process.env.ADMIN_SEED_NAME || "Admin",
  email: process.env.ADMIN_SEED_EMAIL,
  password: process.env.ADMIN_SEED_PASSWORD,
};

if (!NEW_ADMIN.email || !NEW_ADMIN.password) {
  console.error(
    "❌ Set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD in server/.env before running this script."
  );
  process.exit(1);
}

mongoose.connect(process.env.MONGO_URI);

const resetAdmin = async () => {
  try {
    const { deletedCount } = await User.deleteMany({ role: "admin" });
    console.log(`🗑️  Removed ${deletedCount} existing admin account(s).`);

    /* Use User.create so the pre-save hook hashes the password */
    await User.create(NEW_ADMIN);

    console.log("✅ New admin created successfully.");
    console.log("   Email: " + NEW_ADMIN.email);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error resetting admin:", err.message);
    process.exit(1);
  }
};

resetAdmin();
