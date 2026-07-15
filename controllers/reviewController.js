const Review       = require("../models/Review");
const asyncHandler = require("../utils/asyncHandler");
const ApiError     = require("../utils/ApiError");

/* GET /api/reviews — public, newest first */
const getReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find().sort({ createdAt: -1 }).limit(100);
  res.json({ type: "success", reviews });
});

/* POST /api/reviews — public, anyone can submit */
const createReview = asyncHandler(async (req, res) => {
  const { name, rating, text } = req.body;

  if (!name || !rating || !text) {
    throw ApiError.badRequest("Name, rating, and review text are required.");
  }

  if (text.trim().length < 20) {
    throw ApiError.badRequest("Review must be at least 20 characters.");
  }

  const review = await Review.create({
    name:   name.trim(),
    rating: Number(rating),
    text:   text.trim(),
  });

  res.status(201).json({ type: "success", review });
});

module.exports = { getReviews, createReview };
