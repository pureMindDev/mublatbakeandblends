const mongoose = require("mongoose");
require("dotenv").config();

const User = require("./models/User");

mongoose.connect(process.env.MONGO_URI);

const createAdmin = async () => {
  try {
    const existing = await User.findOne({ email: "admin@mublat.com" });

    if (existing) {
      console.log("⚠️  Admin already exists — skipping.");
      return process.exit(0);
    }

    /* Use User.create so the pre-save hook hashes the password */
    await User.create({
      name:     "Admin",
      email:    "mublatadmin@gmail.com",
      password: "mublat123",   // will be hashed by pre-save hook
      role:     "admin",
    });

    console.log("✅ Admin created successfully.");
    console.log("   Email:    mublatadmin@gmail.com");
    console.log("   Password: mublat123");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error creating admin:", err.message);
    process.exit(1);
  }
};

createAdmin();
