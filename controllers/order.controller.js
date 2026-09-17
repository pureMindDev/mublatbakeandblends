const Order        = require("../models/Order");
const asyncHandler = require("../utils/asyncHandler");
const ApiError     = require("../utils/ApiError");
const {
  sendOrderConfirmation,
  sendAdminNotification,
  sendPaymentConfirmation,
} = require("../services/emailService");

/*
 * POST /api/orders — public, called from frontend checkout.
 *
 * SECURITY: only pick the fields a customer is allowed to set. req.body is
 * NOT passed straight into Order.create — otherwise a customer could send
 * paymentStatus/isPaid/orderId/status directly and mark their own order
 * paid, forge the order number, etc. Payment can only ever be confirmed by
 * an admin via PATCH /api/orders/:id/payment (see updateOrderPayment below).
 */
const createOrder = asyncHandler(async (req, res) => {
  const {
    customerName, email, phone, address, method,
    deliveryFee, items, totalAmount, status,
  } = req.body;

  const orderData = {
    customerName,
    email: email || "",
    phone,
    address: address || "",
    method,
    deliveryFee: Number(deliveryFee || 0),
    items,
    totalAmount,
    // paymentMethod, paymentStatus, isPaid, paidAt, orderId are NEVER taken
    // from the request body — they're schema defaults / server-generated.
    // Payment can only move to "Paid" via the admin-only updateOrderPayment
    // action below, so a customer can never mark their own order as paid.
  };

  // The fulfillment `status` (Pending/Preparing/...) is only honoured when
  // this request comes from an authenticated admin — e.g. the "Create
  // Order" modal in the dashboard for phone/walk-in orders. A public
  // checkout request always starts as the schema default ("Pending").
  if (req.user?.role === "admin" && status) {
    orderData.status = status;
  }

  const order = await Order.create(orderData);

  /* Send emails (non-blocking — don't fail the order if email fails) */
  try {
    if (order.email) await sendOrderConfirmation(order);
    await sendAdminNotification(order);
  } catch (emailErr) {
    console.error("Email error (order still created):", emailErr.message);
  }

  res.status(201).json({
    type:    "success",
    message: "Order placed successfully",
    order,
  });
});

/* GET /api/orders?page=1&limit=10&status=Pending&search=ORD */
const getOrders = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 10 } = req.query;

  const filter = {};
  if (status && status !== "All") filter.status = status;
  if (search) {
    filter.$or = [
      { customerName: { $regex: search, $options: "i" } },
      { phone:        { $regex: search, $options: "i" } },
      { orderId:      { $regex: search, $options: "i" } },
      { email:        { $regex: search, $options: "i" } },
    ];
  }

  const skip  = (Number(page) - 1) * Number(limit);
  const total = await Order.countDocuments(filter);

  const orders = await Order.find(filter)
    .populate("items.product", "name images")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  res.json({
    type: "success",
    total,
    page:       Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    orders,
  });
});

/* GET /api/orders/stats — admin dashboard aggregation */
const getOrderStats = asyncHandler(async (req, res) => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [statusCounts, todayData] = await Promise.all([
    /* Count of each status across all orders */
    Order.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),

    /* Today's count and revenue */
    Order.aggregate([
      { $match: { createdAt: { $gte: todayStart } } },
      { $group: {
        _id:     null,
        count:   { $sum: 1 },
        revenue: { $sum: "$totalAmount" },
      }},
    ]),
  ]);

  /* Shape status counts into an object */
  const counts = {};
  statusCounts.forEach(({ _id, count }) => { counts[_id] = count; });

  const today = todayData[0] || { count: 0, revenue: 0 };

  res.json({
    type: "success",
    stats: {
      totalOrders:   await Order.countDocuments(),
      todayOrders:   today.count,
      todayRevenue:  today.revenue,
      pending:       counts["Pending"]          || 0,
      preparing:     counts["Preparing"]        || 0,
      outForDelivery:counts["Out for Delivery"] || 0,
      delivered:     counts["Delivered"]        || 0,
      cancelled:     counts["Cancelled"]        || 0,
    },
  });
});

/* GET /api/orders/:id */
const getOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id).populate("items.product", "name images");
  if (!order) throw ApiError.notFound("Order not found");
  res.json({ type: "success", order });
});

/* PATCH /api/orders/:id/status — update status only */
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true }
  );
  if (!order) throw ApiError.notFound("Order not found");
  res.json({ type: "success", message: "Order status updated", order });
});

/* PUT /api/orders/:id — full update (admin manual edit) */
const updateOrder = asyncHandler(async (req, res) => {
  const order = await Order.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );
  if (!order) throw ApiError.notFound("Order not found");
  res.json({ type: "success", message: "Order updated successfully", order });
});

/* DELETE /api/orders/:id */
const deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findByIdAndDelete(req.params.id);
  if (!order) throw ApiError.notFound("Order not found");
  res.json({ type: "success", message: "Order deleted successfully" });
});

/*
 * PATCH /api/orders/:id/payment — admin only
 *
 * The ONLY way an order's paymentStatus can move from "Pending" to "Paid".
 * Used once the admin has manually checked the bank account and confirmed
 * the transfer landed. Never exposed on any public/customer route.
 *
 * - Idempotent: confirming an already-paid order is a no-op (no duplicate email).
 * - Does not create a new order or a new order number.
 */
const updateOrderPayment = asyncHandler(async (req, res) => {
  const { paymentStatus } = req.body;

  // This endpoint only ever moves an order forward to "Paid". Marking an
  // order back to "Pending" (e.g. to correct a mistake) isn't exposed here —
  // that's an intentional guard, not an oversight.
  if (paymentStatus !== "Paid") {
    throw ApiError.badRequest('paymentStatus must be "Paid" for this action');
  }

  const order = await Order.findById(req.params.id);
  if (!order) throw ApiError.notFound("Order not found");

  if (order.paymentStatus === "Paid") {
    return res.json({
      type: "success",
      message: "Order was already marked as paid",
      order,
    });
  }

  order.paymentStatus = "Paid"; // pre-save hook also syncs isPaid/paidAt
  await order.save();

  try {
    await sendPaymentConfirmation(order);
  } catch (emailErr) {
    console.error("Payment confirmation email error (order still marked paid):", emailErr.message);
  }

  res.json({ type: "success", message: "Order marked as paid", order });
});

module.exports = {
  createOrder, getOrders, getOrderStats,
  getOrder, updateOrderStatus, updateOrder, deleteOrder,
  updateOrderPayment,
};