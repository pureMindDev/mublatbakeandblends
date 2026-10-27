const express = require("express");
const router  = express.Router();
const c = require("../controllers/videoReviewController");
const protect   = require("../middlewares/auth.middleware");
const adminOnly = require("../middlewares/adminMiddleware");

router.get("/", c.getApprovedVideoReviews);                                   // public: approved only

router.get(   "/admin/all",  protect, adminOnly, c.getAllVideoReviews);
router.get(   "/upload-signature", protect, adminOnly, c.getUploadSignature);
router.post(  "/",           protect, adminOnly, c.createVideoReview);
router.patch( "/:id",        protect, adminOnly, c.updateVideoReview);
router.delete("/:id",        protect, adminOnly, c.deleteVideoReview);

module.exports = router;
