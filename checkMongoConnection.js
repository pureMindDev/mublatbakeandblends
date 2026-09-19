/**
 * Diagnoses MongoDB connection problems without ever printing your password.
 *
 * Usage: node checkMongoConnection.js
 */

const mongoose = require("mongoose");
require("dotenv").config();

const uri = process.env.MONGO_URI;

if (!uri) {
  console.error("❌ MONGO_URI is not set in server/.env at all.");
  process.exit(1);
}

// Mask the password so it's safe to look at / paste into chat
const masked = uri.replace(/:\/\/([^:]+):([^@]+)@/, "://$1:****@");
console.log("🔎 Using MONGO_URI:", masked);
console.log("   Protocol:", uri.startsWith("mongodb+srv://") ? "mongodb+srv (Atlas)" : uri.startsWith("mongodb://") ? "mongodb (self-hosted/local)" : "⚠️ unrecognised — should start with mongodb:// or mongodb+srv://");

(async () => {
  try {
    console.log("⏳ Attempting connection (10s timeout)...");
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
    console.log("✅ Connected successfully!");
    console.log("   Database name:", mongoose.connection.name);
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log("   Collections found:", collections.map(c => c.name).join(", ") || "(none)");
    process.exit(0);
  } catch (err) {
    console.error("❌ Connection failed:", err.message);
    if (err.message.includes("bad auth") || err.message.includes("authentication")) {
      console.error("   → Username or password in MONGO_URI is likely wrong.");
    } else if (err.message.includes("ENOTFOUND") || err.message.includes("querySrv")) {
      console.error("   → The cluster hostname couldn't be resolved. Check the URI is copied correctly from Atlas, and that you have internet access / DNS is working.");
    } else if (err.message.includes("timed out")) {
      console.error("   → Nothing responded in time. Most likely your IP isn't whitelisted in Atlas Network Access, the cluster is paused, or a firewall/VPN is blocking outbound MongoDB traffic.");
    }
    process.exit(1);
  }
})();
