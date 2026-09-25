const Order        = require("../models/Order");
const asyncHandler = require("../utils/asyncHandler");
const ApiError     = require("../utils/ApiError");

/**
 * GET /api/orders/track/:orderId
 * Public endpoint — no auth required.
 *
 * Fix #2: Now queries the stored orderId field directly with an index —
 * no more loading 500 orders into memory and filtering in JS.
 *
 * Also used by the checkout Success page to fetch the authoritative order
 * (number, total, payment status) from the server instead of trusting
 * whatever was passed through client-side navigation state.
 */
const trackOrder = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const normalised  = orderId.trim().toUpperCase();

  // Current format is "ORD-0001"; "MUB-0001" is the legacy format used for
  // orders created before the order-numbering change (orders and products
  // used to share the MUB- prefix). Support bare numbers (just digits)
  // defaulting to the current ORD- prefix, plus both full prefixed forms
  // (padded and as-typed) so old MUB- orders can still be tracked.
  const candidates = new Set([normalised]);
  if (/^\d+$/.test(normalised)) {
    candidates.add(`ORD-${normalised.padStart(4, "0")}`);
    candidates.add(`MUB-${normalised.padStart(4, "0")}`);
  }
  if (!normalised.includes("-")) {
    candidates.add(`ORD-${normalised}`);
    candidates.add(`MUB-${normalised}`);
  }

  // Also support direct MongoDB _id lookup as fallback
  const order = await Order.findOne({
    $or: [
      { orderId: { $in: [...candidates] } },
      ...(orderId.match(/^[a-f\d]{24}$/i) ? [{ _id: orderId }] : []),
    ],
  }).select(
    "customerName phone method address items totalAmount deliveryFee status " +
    "paymentMethod paymentStatus createdAt orderId"
  );

  if (!order) {
    throw ApiError.notFound(`No order found with ID "${orderId}"`);
  }

  res.json({
    type:  "success",
    order: {
      _id:           order._id,
      orderId:       order.orderId,
      customerName:  order.customerName,
      method:        order.method,
      address:       order.address,
      items:         order.items,
      totalAmount:   order.totalAmount,
      deliveryFee:   order.deliveryFee,
      status:        order.status,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      createdAt:     order.createdAt,
    },
  });
});

module.exports = { trackOrder };
