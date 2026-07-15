const express  = require("express");
const router   = express.Router();

const {
  getProducts, getProduct, createProduct,
  updateProduct, deleteProduct,
  toggleProduct, activateProduct, deactivateProduct,
} = require("../controllers/product.controller");

const protect   = require("../middlewares/auth.middleware");
const adminOnly = require("../middlewares/adminMiddleware");
const {
  productValidation,
  updateProductValidation,
} = require("../validations/productValidation");

/* ── Public ── */
router.get("/",    getProducts);
router.get("/:id", getProduct);

/* ── Admin only ── */
router.post(  "/",              protect, adminOnly, productValidation,      createProduct);
router.put(   "/:id",           protect, adminOnly, updateProductValidation, updateProduct);
router.delete("/:id",           protect, adminOnly,                          deleteProduct);

/* Toggle flips current state — used by single product toggle */
router.patch("/:id/toggle",     protect, adminOnly, toggleProduct);

/* Activate/deactivate set state explicitly — used by bulk actions */
router.patch("/:id/activate",   protect, adminOnly, activateProduct);
router.patch("/:id/deactivate", protect, adminOnly, deactivateProduct);

module.exports = router;