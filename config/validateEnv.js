/**
 * Fails fast (with a clear message) if required environment variables are
 * missing, instead of letting the app boot into a broken state — e.g. Brevo
 * silently failing to send because BREVO_API_KEY is undefined, or admin
 * order notifications going nowhere because ADMIN_EMAIL isn't set.
 *
 * NOTE: this file is `require`'d by server.js but was missing from the
 * uploaded export — if that's also true of what's actually deployed, the
 * server would crash on startup with
 * "Cannot find module './config/validateEnv'" before it ever got to the
 * point of sending emails. Re-add this file (or confirm it already exists
 * on the deployed server under a different path) as a first check.
 */

const REQUIRED = [
  "MONGO_URI",
  "JWT_SECRET",
  "BREVO_API_KEY",
  "BREVO_FROM_EMAIL",
  "ADMIN_EMAIL",
];

// Not strictly required to boot, but silently degrade features if missing —
// warned about rather than fatal.
const RECOMMENDED = [
  "BREVO_FROM_NAME",
  "CLIENT_URL",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
];

function validateEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key] || process.env[key].trim() === "");
  const missingRecommended = RECOMMENDED.filter((key) => !process.env[key] || process.env[key].trim() === "");

  if (missing.length > 0) {
    console.error("\n❌ Missing required environment variable(s):");
    missing.forEach((key) => console.error(`   - ${key}`));
    console.error(
      "\nSet these in your hosting platform's environment settings (Render/Railway/etc.) " +
      "or in a local .env file, then restart the server. See .env.example for the full list.\n"
    );
    process.exit(1);
  }

  if (missingRecommended.length > 0) {
    console.warn("⚠️  Missing recommended environment variable(s) — some features may not work:");
    missingRecommended.forEach((key) => console.warn(`   - ${key}`));
  }

  // Specific sanity check for the exact symptom reported: admin order
  // notifications not arriving. This doesn't verify deliverability (that
  // depends on the sender being verified in Brevo), only that the variable
  // is actually set to something.
  if (process.env.ADMIN_EMAIL) {
    console.log(`✅ Admin order notifications will be sent to: ${process.env.ADMIN_EMAIL}`);
  }

  console.log("✅ Environment variables validated");
}

module.exports = validateEnv;
