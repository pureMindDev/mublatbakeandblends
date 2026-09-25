const mongoose = require("mongoose");
const Counter = require("./Counter");
const { ORDER_STATUSES, DELIVERY_METHODS, PAYMENT_STATUSES } = require("../utils/constants");

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
      default: "Bank Transfer", // Stripe/Card is temporarily disabled in the active checkout
    },

    // Payment confirmation state. "Pending" until the admin manually confirms
    // the bank transfer has been received — the customer can never set this.
    paymentStatus: {
      type: String,
      enum: PAYMENT_STATUSES, // ["Pending", "Paid"]
      default: "Pending",
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
    // Format: ORD-0001, ORD-0002, ... (see the pre-save hook below)
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

// Auto-generate a sequential orderId before saving if not already set.
// Format: ORD-0001, ORD-0002, ... via an atomic counter document, so two
// checkouts happening at the same instant can never collide on the same number.
//
// Uses its own counter document ("orderNumberOrd"), completely separate from
// the product SKU counter ("productSku" in Product.js) — the two sequences
// have always been independent. It's also a NEW counter rather than reusing
// the old "orderNumber" counter (which had already reached MUB-0008/0009 and
// beyond), so the first order created under this format starts fresh at
// ORD-0001 instead of continuing the old MUB- sequence as ORD-0010 etc.
// Existing orders already stored as MUB-XXXX are untouched by this change —
// they keep their existing orderId; only newly created orders get ORD-XXXX.
// NOTE: Mongoose 9 deprecated callback-style hooks — use async instead
orderSchema.pre("save", async function () {
  if (!this.orderId) {
    const counter = await Counter.findOneAndUpdate(
      { _id: "orderNumberOrd" },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.orderId = "ORD-" + String(counter.seq).padStart(4, "0");
  }

  // Keep the legacy isPaid/paidAt fields in sync with paymentStatus so any
  // existing code that still reads isPaid (e.g. the Stripe flow) keeps working.
  if (this.isModified("paymentStatus")) {
    if (this.paymentStatus === "Paid") {
      this.isPaid = true;
      if (!this.paidAt) this.paidAt = new Date();
    } else {
      this.isPaid = false;
      this.paidAt = undefined;
    }
  }
});

orderSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("Order", orderSchema);