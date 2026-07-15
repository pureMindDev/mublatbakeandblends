const express = require("express");
const router  = express.Router();

const { uploadImages, deleteImage }    = require("../controllers/uploadController");
const { uploadMultiple }               = require("../middlewares/uploadMiddleware");
const protect                          = require("../middlewares/auth.middleware");
const adminOnly                        = require("../middlewares/adminMiddleware");

/* Admin only — upload up to 3 product images */
router.post(  "/images", protect, adminOnly, uploadMultiple, uploadImages);
router.delete("/image",  protect, adminOnly, deleteImage);

module.exports = router;
