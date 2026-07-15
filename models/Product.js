const mongoose = require("mongoose");
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

// Automatically generate SKU if not provided
productSchema.pre("save", async function () {
  if (this.sku) return;

  const Product = mongoose.models.Product;

  const lastProduct = await Product.findOne().sort({ createdAt: -1 });

  let nextNumber = 1;

  if (lastProduct?.sku) {
    nextNumber = parseInt(lastProduct.sku.replace("MUB-", ""), 10) + 1;
  }

  this.sku = `MUB-${String(nextNumber).padStart(4, "0")}`;
});

module.exports = mongoose.model("Product", productSchema);