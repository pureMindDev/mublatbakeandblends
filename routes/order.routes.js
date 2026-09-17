const express = require("express");
const router  = express.Router();

const {
  createOrder, getOrders, getOrderStats,
  getOrder, updateOrderStatus, updateOrder, deleteOrder,
  updateOrderPayment,
} = require("../controllers/order.controller");

const { trackOrder } = require("../controllers/trackController");

const protect      = require("../middlewares/auth.middleware");
const adminOnly    = require("../middlewares/adminMiddleware");
const optionalAuth = require("../middlewares/optionalAuth.middleware");
const {
  orderValidation,
  updateStatusValidation,
  updatePaymentValidation,
} = require("../validations/orderValidation");

/* ── PUBLIC ──
 * optionalAuth runs first so that if this request comes from a logged-in
 * admin (the "Create Order" modal in the dashboard), req.user is available
 * and the admin's chosen fulfillment status is respected. Anonymous
 * checkout requests are unaffected — see createOrder for what's allowed. */
router.post("/",              optionalAuth, orderValidation, createOrder);

/* Public order tracking — must be before /:id so it matches first */
router.get("/track/:orderId", trackOrder);

/* ── ADMIN ONLY ── */
router.get(   "/stats",       protect, adminOnly, getOrderStats);
router.get(   "/",            protect, adminOnly, getOrders);
router.get(   "/:id",         protect, adminOnly, getOrder);
router.patch( "/:id/status",  protect, adminOnly, updateStatusValidation, updateOrderStatus);
router.patch( "/:id/payment", protect, adminOnly, updatePaymentValidation, updateOrderPayment);
router.put(   "/:id",         protect, adminOnly, updateOrder);
router.delete("/:id",         protect, adminOnly, deleteOrder);

module.exports = router;
