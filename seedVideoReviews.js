/**
 * Registers the three supplied customer review videos (shipped in the
 * frontend's public/videos/ folder) as APPROVED video reviews.
 *   node seedVideoReviews.js
 * Safe to re-run: skips any video URL that already exists. No customer names
 * are stored — add one later in Admin > Video Reviews only if the customer
 * has approved it.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const VideoReview = require("./models/VideoReview");

const VIDEOS = [1, 2, 3].map((n) => ({
  videoUrl: `/videos/customer-review-${n}.mp4`,
  posterUrl: `/videos/customer-review-${n}-poster.jpg`,
  sortOrder: n,
  approved: true,
}));

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  for (const v of VIDEOS) {
    const exists = await VideoReview.exists({ videoUrl: v.videoUrl });
    if (exists) { console.log("skip (exists):", v.videoUrl); continue; }
    await VideoReview.create(v);
    console.log("added:", v.videoUrl);
  }
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
