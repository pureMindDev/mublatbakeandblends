const mongoose = require("mongoose");
const { ORDER_STATUSES, DELIVERY_METHODS } = require("../utils/constants");

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
  name: { type: String, required: true },
  optionName: { type: String, default: "Standard" },
  quantity: { type: Number, required: true, min: 1 },
  price: { type: Number, required: true, min: 0 },
});

const orderSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
    },

    email: { type: String, trim: true, default: "" },
    phone: { type: String, required: [true, "Phone number is required"], trim: true },
    address: { type: String, default: "", trim: true },

    method: {
      type: String,
      enum: DELIVERY_METHODS,
      required: [true, "Delivery method is required"],
    },

    paymentMethod: {
      type: String,
      enum: ["Card", "Bank Transfer"],
      default: "Card",
    },

    items: {
      type: [orderItemSchema],
      validate: {
        validator: (arr) => arr.length >= 1,
        message: "Order must contain at least one item",
      },
    },

    deliveryFee: { type: Number, default: 0, min: 0 },
    totalAmount: { type: Number, required: [true, "Total amount is required"], min: 0 },

    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "Pending",
    },

    // Fix #1: Store a real orderId field so tracking doesn't need to scan 500 docs
    // Format: ORD-XXXXXX (6 hex chars = 16^6 = ~16 million unique values)
    orderId: {
      type: String,
      unique: true,
      index: true,
    },

    stripeSessionId: { type: String, default: "" },
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date },
  },
  { timestamps: true }
);

// Auto-generate orderId before saving if not already set
// NOTE: Mongoose 9 deprecated callback-style hooks — use async instead
orderSchema.pre("save", async function () {
  if (!this.orderId) {
    // Use last 6 chars of ObjectId (hex) — gives 16^6 ≈ 16M unique values
    this.orderId = "ORD-" + String(this._id).slice(-6).toUpperCase();
  }
});

orderSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Order", orderSchema);