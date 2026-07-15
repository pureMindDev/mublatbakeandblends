const Order        = require("../models/Order");
const asyncHandler = require("../utils/asyncHandler");
const ApiError     = require("../utils/ApiError");

/**
 * GET /api/orders/track/:orderId
 * Public endpoint — no auth required.
 *
 * Fix #2: Now queries the stored orderId field directly with an index —
 * no more loading 500 orders into memory and filtering in JS.
 */
const trackOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const normalised  = orderId.trim().toUpperCase();

  // Support both "ORD-ABC123" and bare "ABC123"
  const queryId = normalised.startsWith("ORD-") ? normalised : `ORD-${normalised}`;

  // Also support direct MongoDB _id lookup as fallback
  const order = await Order.findOne({
    $or: [
      { orderId: queryId },
      { orderId: normalised },
      ...(orderId.match(/^[a-f\d]{24}$/i) ? [{ _id: orderId }] : []),
    ],
  }).select(
    "customerName phone method address items totalAmount deliveryFee status createdAt orderId"
  );

  if (!order) {
    throw ApiError.notFound(`No order found with ID "${orderId}"`);
  }

  res.json({
    type:  "success",
    order: {
      _id:          order._id,
      orderId:      order.orderId,
      customerName: order.customerName,
      method:       order.method,
      address:      order.address,
      items:        order.items,
      totalAmount:  order.totalAmount,
      deliveryFee:  order.deliveryFee,
      status:       order.status,
      createdAt:    order.createdAt,
    },
  });
});

module.exports = { trackOrder };
