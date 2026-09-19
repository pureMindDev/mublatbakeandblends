/**
 * Seeds the first admin account. Only creates one if none exists yet for
 * this email — use resetAdmin.js instead if you want to replace an
 * existing admin.
 *
 * Usage:
 *   1. In server/.env set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD.
 *   2. From the /server folder run:  node seedAdmin.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

const User = require("./models/User");

mongoose.connect(process.env.MONGO_URI);

const createAdmin = async () => {
  try {
    const email = process.env.ADMIN_SEED_EMAIL;
    const password = process.env.ADMIN_SEED_PASSWORD;

    if (!email || !password) {
      console.error(
        "❌ Set ADMIN_SEED_EMAIL and ADMIN_SEED_PASSWORD in server/.env before running this script."
      );
      return process.exit(1);
    }

    const existing = await User.findOne({ email });

    if (existing) {
      console.log("⚠️  Admin already exists — skipping.");
      return process.exit(0);
    }

    /* Use User.create so the pre-save hook hashes the password */
    await User.create({
      name: process.env.ADMIN_SEED_NAME || "Admin",
      email,
      password,
      role: "admin",
    });

    console.log("✅ Admin created successfully.");
    console.log("   Email: " + email);
    process.exit(0);
  } catch (err) {
    console.error("❌ Error creating admin:", err.message);
    process.exit(1);
  }
};

createAdmin();
