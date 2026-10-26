const multer       = require("multer");
const streamifier  = require("streamifier");
const cloudinary   = require("../config/cloudinary");
const VideoReview  = require("../models/VideoReview");
const asyncHandler = require("../utils/asyncHandler");
const ApiError     = require("../utils/ApiError");

const MAX_VIDEO_MB = 100;

/* Only same-site files under /videos/ or https URLs (e.g. Cloudinary). */
const isSafeUrl = (u) =>
  typeof u === "string" &&
  (/^\/videos\/[\w\-./]+$/.test(u) && !u.includes("..") || /^https:\/\/[^\s]+$/i.test(u));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_VIDEO_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    file.mimetype.startsWith("video/")
      ? cb(null, true)
      : cb(ApiError.badRequest("Only video files are allowed"), false),
});
const uploadSingleVideo = upload.single("video");

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

/* POST /api/video-reviews — admin, register an existing video URL */
const createVideoReview = asyncHandler(async (req, res) => {
  const { videoUrl, posterUrl = "", customerName = "", caption = "" } = req.body;
  if (!isSafeUrl(videoUrl)) {
    throw ApiError.badRequest("videoUrl must be an https:// link or a /videos/… file path.");
  }
  if (posterUrl && !isSafeUrl(posterUrl) && !/^\/videos\//.test(posterUrl)) {
    throw ApiError.badRequest("posterUrl must be an https:// link or a /videos/… file path.");
  }
  // New videos always start UNAPPROVED; an admin approves them explicitly.
  const video = await VideoReview.create({ videoUrl, posterUrl, customerName, caption, approved: false });
  res.status(201).json({ type: "success", video });
});

/* POST /api/video-reviews/upload — admin, multipart field "video" → Cloudinary */
const uploadVideoReview = asyncHandler(async (req, res) => {
  if (!req.file) throw ApiError.badRequest("No video provided");

  const result = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: "video", folder: "mublat/video-reviews" },
      (err, r) => (err ? reject(err) : resolve(r))
    );
    streamifier.createReadStream(req.file.buffer).pipe(stream);
  });

  const posterUrl = cloudinary.url(result.public_id, {
    resource_type: "video", format: "jpg", start_offset: 1,
    width: 480, crop: "limit", secure: true,
  });

  const video = await VideoReview.create({
    videoUrl: result.secure_url,
    posterUrl,
    cloudinaryId: result.public_id,
    customerName: (req.body.customerName || "").trim(),
    caption: (req.body.caption || "").trim(),
    approved: false,
  });
  res.status(201).json({ type: "success", video });
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
  uploadSingleVideo,
  getApprovedVideoReviews, getAllVideoReviews,
  createVideoReview, uploadVideoReview, updateVideoReview, deleteVideoReview,
};
