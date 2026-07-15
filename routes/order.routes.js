const express = require("express");
const router  = express.Router();

const {
  createOrder, getOrders, getOrderStats,
  getOrder, updateOrderStatus, updateOrder, deleteOrder,
} = require("../controllers/order.controller");

const { trackOrder } = require("../controllers/trackController");

const protect   = require("../middlewares/auth.middleware");
const adminOnly = require("../middlewares/adminMiddleware");
const {
  orderValidation,
  updateStatusValidation,
} = require("../validations/orderValidation");

/* ── PUBLIC ── */
router.post("/",              orderValidation, createOrder);

/* Public order tracking — must be before /:id so it matches first */
router.get("/track/:orderId", trackOrder);

/* ── ADMIN ONLY ── */
router.get(   "/stats",       protect, adminOnly, getOrderStats);
router.get(   "/",            protect, adminOnly, getOrders);
router.get(   "/:id",         protect, adminOnly, getOrder);
router.patch( "/:id/status",  protect, adminOnly, updateStatusValidation, updateOrderStatus);
router.put(   "/:id",         protect, adminOnly, updateOrder);
router.delete("/:id",         protect, adminOnly, deleteOrder);

module.exports = router;
