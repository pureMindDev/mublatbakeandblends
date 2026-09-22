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
];

// Not strictly required to boot, but silently degrade features if missing —
// warned about rather than fatal. ADMIN_EMAIL lives here (not in REQUIRED)
// because utils/constants.js falls back to mublatbakeandblends@gmail.com
// when it's unset — so the app still works, but it's worth knowing whether
// that fallback is the one actually in use.
const RECOMMENDED = [
  "ADMIN_EMAIL",
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
  // notifications not arriving. ADMIN_EMAIL (utils/constants.js) always
  // resolves to something — either the env var or the built-in fallback —
  // so this always prints, telling you at a glance which one is active.
  const { ADMIN_EMAIL } = require("../utils/constants");
  const usingFallback = !process.env.ADMIN_EMAIL || process.env.ADMIN_EMAIL.trim() === "";
  console.log(
    `✅ Admin order notifications will be sent to: ${ADMIN_EMAIL}` +
    (usingFallback ? " (ADMIN_EMAIL env var not set — using built-in fallback)" : "")
  );

  console.log("✅ Environment variables validated");
}

module.exports = validateEnv;
