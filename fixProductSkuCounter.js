/**
 * One-off repair script.
 *
 * Run this ONCE against your live database if you're seeing
 * "sku already exists" errors when adding a new product.
 *
 * What's happening: new SKUs are handed out by a counter document
 * (see models/Counter.js). If that counter ever falls behind the real
 * highest SKU already in your products collection — for example it was
 * created before some products were seeded/added — it will keep handing
 * out numbers that are already taken, and every "Add Product" will fail
 * with "sku already exists".
 *
 * This script looks at the real data, finds the true highest MUB-#### in
 * use, and resets the counter to match it. After running this once, new
 * products will always get the next free number.
 *
 * Usage (from the server/ folder, with your .env in place):
 *   node fixProductSkuCounter.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const Product = require("./models/Product");
const Counter = require("./models/Counter");

async function run() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set — check your .env file.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 5000 });
  console.log("Connected to database.");

  const highest = await Product.find({ sku: /^MUB-\d+$/ })
    .sort({ sku: -1 })
    .limit(1);

  const trueHighest = highest.length
    ? parseInt(highest[0].sku.replace("MUB-", ""), 10)
    : 0;

  const before = await Counter.findById("productSku");

  const after = await Counter.findOneAndUpdate(
    { _id: "productSku" },
    { $set: { seq: trueHighest } },
    { new: true, upsert: true }
  );

  console.log(`Highest real product SKU in use: MUB-${String(trueHighest).padStart(4, "0")}`);
  console.log(`Counter before: ${before ? before.seq : "(did not exist)"}`);
  console.log(`Counter after:  ${after.seq}`);
  console.log(`Next product created will get: MUB-${String(after.seq + 1).padStart(4, "0")}`);

  await mongoose.disconnect();
  console.log("Done. You can add products normally now.");
}

run().catch((err) => {
  console.error("Failed to fix the counter:", err);
  process.exit(1);
});
