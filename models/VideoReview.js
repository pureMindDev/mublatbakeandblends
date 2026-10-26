const mongoose = require("mongoose");

// Real customer video testimonials. Only documents with approved === true are
// ever returned by the public API. Videos are NEVER stored in MongoDB — only
// their URL (same-site /videos/... file, or a Cloudinary https URL).
const videoReviewSchema = new mongoose.Schema(
  {
    // Shown only if the business supplied/approved it — never invented.
    customerName: { type: String, trim: true, maxlength: 80, default: "" },
    caption:      { type: String, trim: true, maxlength: 200, default: "" },

    videoUrl:  { type: String, required: true, trim: true },
    posterUrl: { type: String, trim: true, default: "" },

    approved:  { type: Boolean, default: false, index: true },
    sortOrder: { type: Number, default: 0 },

    // Set when the file was uploaded through the admin page (for cleanup).
    cloudinaryId: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("VideoReview", videoReviewSchema);
