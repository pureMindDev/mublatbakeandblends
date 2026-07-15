const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    name:   { type: String, required: true, trim: true, maxlength: 80 },
    rating: { type: Number, required: true, min: 1, max: 5 },
    text:   { type: String, required: true, trim: true, minlength: 20, maxlength: 1000 },
    role:   { type: String, default: "Verified Customer" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Review", reviewSchema);
