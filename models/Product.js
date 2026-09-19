const mongoose = require("mongoose");
const Counter = require("./Counter");
const { PRODUCT_CATEGORIES } = require("../utils/constants");

const optionSchema = new mongoose.Schema({
  label: {
    type: String,
    required: true,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
});

const productSchema = new mongoose.Schema(
  {
    sku: {
      type: String,
      unique: true,
      trim: true,
    },

    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      maxlength: [60, "Name cannot exceed 60 characters"],
    },

    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [200, "Description cannot exceed 200 characters"],
    },

    fullDescription: {
      type: String,
      trim: true,
      default: "",
    },

    category: {
      type: String,
      enum: PRODUCT_CATEGORIES,
      required: [true, "Category is required"],
    },

    images: [
      {
        type: String,
      },
    ],

    ingredients: [
      {
        type: String,
      },
    ],

    options: {
      type: [optionSchema],
      validate: {
        validator: (arr) => arr.length > 0,
        message: "At least one price option is required",
      },
    },

    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Automatically generate a unique SKU if one wasn't provided.
//
// The previous version looked at the most recently created product and
// added 1 to its SKU number. That breaks in two ways that both produce
// "SKU already exists" errors: (1) it's not atomic, so two products
// created close together can compute the same "next" number and race
// each other, and (2) seeded/manually-added products aren't reliably the
// "most recent by createdAt", so the number it picked could already be
// taken by an older product.
//
// Instead we use the same atomic counter collection already relied on
// for order numbers (see Order.js / Counter.js) — a single findOneAndUpdate
// with $inc is one atomic database operation, so it's impossible for two
// requests to be handed the same number even if they arrive at the exact
// same time.
//
// On top of that, if the counter document itself is ever behind the real
// data (e.g. it was seeded once from an older/incomplete set of products,
// or someone inserted a product with a manual SKU that skipped ahead), a
// plain increment could still hand out a number that's already taken.
// So after computing a candidate SKU we double-check it's actually free
// and, if not, keep advancing the counter until we land on one that is —
// this makes the whole thing self-healing instead of needing a one-off
// manual database fix every time the counter drifts.
productSchema.pre("save", async function () {
  if (this.sku) return;

  const Product = mongoose.models.Product;

  let counter = await Counter.findById("productSku");

  if (!counter) {
    // First time this runs against this database: seed the counter from
    // whatever the highest existing product SKU already is, so we never
    // hand out a number that's already in use by a seeded/older product.
    const highest = await Product.find({ sku: /^MUB-\d+$/ })
      .sort({ sku: -1 })
      .limit(1);

    const startAt = highest.length
      ? parseInt(highest[0].sku.replace("MUB-", ""), 10)
      : 0;

    counter = await Counter.findOneAndUpdate(
      { _id: "productSku" },
      { $setOnInsert: { seq: startAt } },
      { new: true, upsert: true }
    );
  }

  const MAX_ATTEMPTS = 20;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const updated = await Counter.findByIdAndUpdate(
      "productSku",
      { $inc: { seq: 1 } },
      { new: true }
    );

    const candidate = `MUB-${String(updated.seq).padStart(4, "0")}`;
    const taken = await Product.exists({ sku: candidate });

    if (!taken) {
      this.sku = candidate;
      return;
    }
    // Someone already has this SKU (stale/out-of-date counter) — the loop
    // advances the counter again and tries the next number.
  }

  throw new Error(
    "Could not generate a unique product SKU after multiple attempts. " +
    "The product SKU counter may be badly out of sync — please check it."
  );
});

module.exports = mongoose.model("Product", productSchema);