/**
 * Validates required environment variables on startup, and catches a
 * specific dangerous mistake: deploying to production while still pointed
 * at Stripe TEST keys (customers would appear to "pay" successfully, but no
 * real money would ever move — a silent, nasty bug to discover after launch).
 *
 * Call this before connectDB() / anything else in server.js.
 */

const REQUIRED_VARS = [
  "MONGO_URI",
  "JWT_SECRET",
  "CLIENT_URL",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "BREVO_API_KEY",
  "BREVO_FROM_EMAIL",
];

// Not strictly required to boot, but the app degrades silently without it
// (admin order-notification and support emails are just skipped) — worth a
// heads-up rather than a hard failure.
const RECOMMENDED_VARS = ["ADMIN_EMAIL"];

const validateEnv = () => {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error("❌ Missing required environment variable(s):");
    missing.forEach((key) => console.error(`   - ${key}`));
    console.error("   Set these in your .env file before starting the server.");
    process.exit(1);
  }

  const isProduction = process.env.NODE_ENV === "production";
  const stripeKey = process.env.STRIPE_SECRET_KEY || "";
  if (isProduction && stripeKey.startsWith("sk_test_")) {
    console.error(
      "❌ NODE_ENV is \"production\" but STRIPE_SECRET_KEY is a TEST key (sk_test_...)."
    );
    console.error(
      "   Customers would be able to \"complete\" checkout without any real payment going through."
    );
    console.error(
      "   Switch to your live secret key (sk_live_...) from the Stripe Dashboard before deploying."
    );
    process.exit(1);
  }

  if (!isProduction && stripeKey.startsWith("sk_live_")) {
    console.warn(
      "⚠️  Warning: NODE_ENV is not \"production\" but STRIPE_SECRET_KEY is a LIVE key (sk_live_...)."
    );
    console.warn(
      "   Real payments will be processed in this dev/test environment — double-check this is intended."
    );
  }

  RECOMMENDED_VARS.forEach((key) => {
    if (!process.env[key]) {
      console.warn(`⚠️  ${key} is not set — related functionality will be skipped silently until it's added.`);
    }
  });

  console.log(`✅ Environment validated (${process.env.NODE_ENV || "development"} mode).`);
};

module.exports = validateEnv;
