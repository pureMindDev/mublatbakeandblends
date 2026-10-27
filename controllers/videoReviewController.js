const cloudinary   = require("../config/cloudinary");
const VideoReview  = require("../models/VideoReview");
const asyncHandler = require("../utils/asyncHandler");
const ApiError     = require("../utils/ApiError");

/* Only same-site files under /videos/ or https URLs (e.g. Cloudinary). */
const FOLDER = "mublat/video-reviews";

const isSafeUrl = (u) =>
  typeof u === "string" &&
  (/^\/videos\/[\w\-./]+$/.test(u) && !u.includes("..") || /^https:\/\/[^\s]+$/i.test(u));

/* GET /api/video-reviews — public, approved only */
const getApprovedVideoReviews = asyncHandler(async (req, res) => {
  const videos = await VideoReview.find({ approved: true })
    .sort({ sortOrder: 1, createdAt: 1 })
    .limit(30);
  res.json({ type: "success", videos });
});

/* GET /api/video-reviews/admin/all — admin, includes unapproved */
const getAllVideoReviews = asyncHandler(async (req, res) => {
  const videos = await VideoReview.find().sort({ sortOrder: 1, createdAt: 1 });
  res.json({ type: "success", videos });
});

/* POST /api/video-reviews — admin: register a video by URL (or a finished Cloudinary upload) */
const createVideoReview = asyncHandler(async (req, res) => {
  const { videoUrl, customerName = "", caption = "" } = req.body;
  let { posterUrl = "", cloudinaryId = "" } = req.body;

  if (!isSafeUrl(videoUrl)) {
    throw ApiError.badRequest("videoUrl must be an https:// link or a /videos/… file path.");
  }
  if (cloudinaryId) {
    // Only trust the id when the URL really is on OUR Cloudinary account.
    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    if (!cloud || !videoUrl.startsWith(`https://res.cloudinary.com/${cloud}/`) || !cloudinaryId.startsWith(`${FOLDER}/`)) {
      throw ApiError.badRequest("Invalid Cloudinary upload details.");
    }
    if (!posterUrl) {
      posterUrl = cloudinary.url(cloudinaryId, {
        resource_type: "video", format: "jpg", start_offset: 1, width: 480, crop: "limit", secure: true,
      });
    }
  }
  if (posterUrl && !isSafeUrl(posterUrl)) {
    throw ApiError.badRequest("posterUrl must be an https:// link or a /videos/… file path.");
  }
  // New videos always start UNAPPROVED; an admin approves them explicitly.
  const video = await VideoReview.create({ videoUrl, posterUrl, cloudinaryId, customerName, caption, approved: false });
  res.status(201).json({ type: "success", video });
});

/*
 * GET /api/video-reviews/upload-signature — admin.
 * The browser uploads the video STRAIGHT to Cloudinary using this one-time
 * signature, so large files never pass through this server (hosts such as
 * Vercel reject request bodies over a few MB). Afterwards the page calls
 * POST /api/video-reviews with the returned URL.
 */
const getUploadSignature = asyncHandler(async (req, res) => {
  const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: secret } = process.env;
  if (!cloudName || !apiKey || !secret) {
    throw ApiError.internal("Cloudinary is not configured on the server (CLOUDINARY_* variables).");
  }
  const timestamp = Math.round(Date.now() / 1000);
  const params = { timestamp, folder: FOLDER };
  const signature = cloudinary.utils.api_sign_request(params, secret);
  res.json({ type: "success", cloudName, apiKey, timestamp, folder: FOLDER, signature });
});

/* PATCH /api/video-reviews/:id — admin: approve / unapprove / edit */
const updateVideoReview = asyncHandler(async (req, res) => {
  const allowed = ["approved", "customerName", "caption", "sortOrder"];
  const update = {};
  for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];

  const video = await VideoReview.findByIdAndUpdate(req.params.id, update, {
    new: true, runValidators: true,
  });
  if (!video) throw ApiError.notFound("Video review not found");
  res.json({ type: "success", video });
});

/* DELETE /api/video-reviews/:id — admin */
const deleteVideoReview = asyncHandler(async (req, res) => {
  const video = await VideoReview.findByIdAndDelete(req.params.id);
  if (!video) throw ApiError.notFound("Video review not found");
  if (video.cloudinaryId) {
    cloudinary.uploader.destroy(video.cloudinaryId, { resource_type: "video" }).catch(() => {});
  }
  res.json({ type: "success", message: "Video review deleted" });
});

module.exports = {
  getApprovedVideoReviews, getAllVideoReviews,
  createVideoReview, getUploadSignature, updateVideoReview, deleteVideoReview,
};
