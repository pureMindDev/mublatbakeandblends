const stripe       = require("../config/stripe");
const Order        = require("../models/Order");
const asyncHandler = require("../utils/asyncHandler");
const ApiError     = require("../utils/ApiError");
const {
  sendOrderConfirmation,
  sendAdminNotification,
} = require("../services/emailService");

// ─── POST /api/payment/create-intent ──────────────────────────────────────────
// Creates a PaymentIntent and a pending Order.
// Returns { clientSecret, orderId } to the frontend.
// The card form lives entirely on YOUR checkout page — no Stripe redirect.

const createPaymentIntent = asyncHandler(async (req, res) => {
  if (
    !process.env.STRIPE_SECRET_KEY ||
    process.env.STRIPE_SECRET_KEY.includes("your_stripe_secret_key")
  ) {
    throw ApiError.internal("Stripe is not configured.");
  }

  const { items, customerName, email, phone, address, method, deliveryFee } =
    req.body;

  if (!items || items.length === 0) {
    throw ApiError.badRequest("No items in cart");
  }

  const itemsTotal  = items.reduce((s, i) => s + i.price * i.quantity, 0);
  const totalAmount = itemsTotal + Number(deliveryFee || 0);
  const amountPence = Math.round(totalAmount * 100);

  // 1. Save pending order so we have an ID
  const order = await Order.create({
    customerName,
    email:       email || "",
    phone,
    address:     address || "",
    method,
    deliveryFee: Number(deliveryFee || 0),
    items: items.map((i) => ({
      name:       i.name,
      optionName: i.optionName || "Standard",
      quantity:   i.quantity,
      price:      i.price,
    })),
    totalAmount,
    status: "Pending",
    isPaid: false,
  });

  // 2. Create PaymentIntent
  let intent;
  try {
    intent = await stripe.paymentIntents.create({
      amount:   amountPence,
      currency: "gbp",
      metadata: { orderId: String(order._id) },
      receipt_email: email || undefined,
      description: `Mublat order ${order.orderId} — ${customerName}`,
    });
  } catch (stripeErr) {
    await Order.findByIdAndDelete(order._id).catch(() => {});
    throw new ApiError(
      stripeErr.statusCode || 500,
      stripeErr.message || "Stripe error"
    );
  }

  order.stripeSessionId = intent.id;
  await order.save();

  res.json({
    clientSecret: intent.client_secret,
    orderId:      String(order._id),
    orderRef:     order.orderId,
  });
});

// ─── POST /api/payment/confirm ─────────────────────────────────────────────────
// Called by the frontend after Stripe confirms payment on the client side.
// Marks the order paid and sends emails.

const confirmPayment = asyncHandler(async (req, res) => {
  const { paymentIntentId, orderId } = req.body;

  if (!paymentIntentId || !orderId) {
    throw ApiError.badRequest("paymentIntentId and orderId are required.");
  }

  // Verify with Stripe that it's actually paid
  let intent;
  try {
    intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (e) {
    throw new ApiError(500, e.message);
  }

  if (intent.status !== "succeeded") {
    throw ApiError.badRequest(
      `Payment not completed. Status: ${intent.status}`
    );
  }

  const order = await Order.findById(orderId);
  if (!order) throw ApiError.notFound("Order not found.");

  if (!order.isPaid) {
    order.isPaid      = true;
    order.paidAt      = new Date();
    order.status      = "Pending";
    order.totalAmount = intent.amount / 100;
    await order.save();

    try {
      await sendAdminNotification(order);
      await sendOrderConfirmation(order);
      console.log(`✅ Order ${order.orderId} paid — emails sent`);
    } catch (emailErr) {
      console.error("❌ Email error:", emailErr.message);
    }
  }

  res.json({
    type:    "success",
    orderId: String(order._id),
    orderRef: order.orderId,
    order,
  });
});

// ─── POST /api/payment/webhook ─────────────────────────────────────────────────
// Stripe server-side backup for production. Guards against double-processing.

const stripeWebhook = async (req, res) => {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.warn("⚠️  STRIPE_WEBHOOK_SECRET not set — webhook skipped.");
    return res.json({ received: true });
  }

  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body, sig, process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature error:", err.message);
    return res.status(400).json({ message: `Webhook error: ${err.message}` });
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;
    try {
      const order = await Order.findById(intent.metadata.orderId);
      if (order && !order.isPaid) {
        order.isPaid      = true;
        order.paidAt      = new Date();
        order.status      = "Pending";
        order.totalAmount = intent.amount / 100;
        await order.save();
        await sendAdminNotification(order);
        await sendOrderConfirmation(order);
        console.log(`✅ Webhook: order ${order.orderId} confirmed`);
      }
    } catch (err) {
      console.error("Webhook processing error:", err.message);
    }
  }

  res.json({ received: true });
};

module.exports = { createPaymentIntent, confirmPayment, stripeWebhook };