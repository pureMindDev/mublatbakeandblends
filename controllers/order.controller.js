const Order        = require("../models/Order");
const asyncHandler = require("../utils/asyncHandler");
const ApiError     = require("../utils/ApiError");
const { sendOrderConfirmation, sendAdminNotification } = require("../services/emailService");

/* POST /api/orders — public, called from frontend checkout */
const createOrder = asyncHandler(async (req, res) => {
  const order = await Order.create(req.body);

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

module.exports = {
  createOrder, getOrders, getOrderStats,
  getOrder, updateOrderStatus, updateOrder, deleteOrder,
};