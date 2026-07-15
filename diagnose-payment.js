/**
 * DIAGNOSTIC SCRIPT — run this from inside your `server` folder:
 *
 *   node diagnose-payment.js
 *
 * It will tell you exactly which file is stale or which handler
 * is undefined, instead of guessing from a stack trace.
 */

/* IMPORTANT: load .env first, exactly like server.js does — without
   this, process.env.STRIPE_SECRET_KEY is undefined even if your
   .env file is correct, and config/stripe.js will throw immediately. */
require("dotenv").config();

console.log("=== 0. Checking environment variables ===");
const requiredEnvVars = ["STRIPE_SECRET_KEY", "MONGO_URI", "JWT_SECRET"];
for (const key of requiredEnvVars) {
  const val = process.env[key];
  if (!val) {
    console.log(`  ❌ ${key} is NOT set in your .env file`);
  } else if (key === "STRIPE_SECRET_KEY" && (val.includes("your_stripe") || val === "sk_test_")) {
    console.log(`  ❌ ${key} is still the placeholder value — paste your real key`);
  } else {
    const preview = val.length > 12 ? `${val.slice(0, 10)}…(${val.length} chars)` : val;
    console.log(`  ✅ ${key} is set: ${preview}`);
  }
}
console.log("");

console.log("=== 1. Checking paymentController.js exports ===");
let controller;
try {
  controller = require("./controllers/paymentController");
} catch (err) {
  console.log("❌ paymentController.js failed to load at all:");
  console.log(err.message);
  process.exit(1);
}

const expectedHandlers = [
  "createPaymentIntent",
  "confirmOrderPayment",
  "stripeWebhook",
  "getOrderForSuccess",
];

let allGood = true;
for (const name of expectedHandlers) {
  const type = typeof controller[name];
  const ok = type === "function";
  if (!ok) allGood = false;
  console.log(`  ${ok ? "✅" : "❌"} ${name}: ${type}`);
}

if (!allGood) {
  console.log("");
  console.log("👉 At least one handler above is NOT a function.");
  console.log("   Your controllers/paymentController.js is the OLD version,");
  console.log("   or has a typo in its module.exports block.");
  console.log("   Re-paste the new paymentController.js completely —");
  console.log("   don't merge it with the old file.");
  process.exit(1);
}

console.log("");
console.log("=== 2. Checking paymentRoutes.js loads without crashing ===");
try {
  require("./routes/paymentRoutes");
  console.log("✅ paymentRoutes.js loaded successfully — routes are wired correctly.");
} catch (err) {
  console.log("❌ paymentRoutes.js crashed:");
  console.log(err.message);
  process.exit(1);
}

console.log("");
console.log("=== 3. Checking dependencies paymentController.js relies on ===");
const deps = [
  ["../config/stripe",        "./config/stripe"],
  ["../models/Order",         "./models/Order"],
  ["../utils/asyncHandler",   "./utils/asyncHandler"],
  ["../utils/ApiError",       "./utils/ApiError"],
  ["../services/emailService","./services/emailService"],
];

for (const [, localPath] of deps) {
  try {
    const mod = require(localPath);
    console.log(`  ✅ ${localPath} loaded (type: ${typeof mod})`);
  } catch (err) {
    console.log(`  ❌ ${localPath} FAILED to load: ${err.message}`);
    allGood = false;
  }
}

console.log("");
if (allGood) {
  console.log("🎉 Everything checks out. If your server still crashes,");
  console.log("   delete node_modules + package-lock.json and run npm install again —");
  console.log("   this can happen if `stripe` or `express` itself is corrupted.");
} else {
  console.log("👉 Fix the ❌ items above, then run this script again.");
}