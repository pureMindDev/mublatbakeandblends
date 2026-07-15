const multer     = require("multer");
const streamifier = require("streamifier");
const cloudinary  = require("../config/cloudinary");
const ApiError    = require("../utils/ApiError");
const {
  IMAGE_ALLOWED_FORMATS,
  IMAGE_MAX_SIZE_MB,
  MAX_IMAGES_PER_PRODUCT,
} = require("../utils/constants");

// ── Use memory storage — we'll stream to Cloudinary manually ─────────────────
// This removes the multer-storage-cloudinary dependency entirely,
// which conflicts with cloudinary v2.

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(ApiError.badRequest("Only image files are allowed"), false);
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: IMAGE_MAX_SIZE_MB * 1024 * 1024 },
});

// ── Helper: stream a buffer to Cloudinary ────────────────────────────────────
const uploadToCloudinary = (buffer, options = {}) =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder:         "mublat/products",
        allowed_formats: IMAGE_ALLOWED_FORMATS,
        transformation: [{ width: 800, height: 800, crop: "limit", quality: "auto" }],
        ...options,
      },
      (err, result) => {
        if (err) reject(err);
        else resolve(result);
      }
    );
    streamifier.createReadStream(buffer).pipe(stream);
  });

// ── Middleware: upload single image ──────────────────────────────────────────
const uploadSingle = [
  upload.single("image"),
  async (req, res, next) => {
    if (!req.file) return next();
    try {
      const result   = await uploadToCloudinary(req.file.buffer);
      req.file.path  = result.secure_url;
      req.file.cloudinaryId = result.public_id;
      next();
    } catch (err) {
      next(ApiError.internal("Image upload failed: " + err.message));
    }
  },
];

// ── Middleware: upload multiple images ───────────────────────────────────────
const uploadMultiple = [
  upload.array("images", MAX_IMAGES_PER_PRODUCT),
  async (req, res, next) => {
    if (!req.files || req.files.length === 0) return next();
    try {
      const results = await Promise.all(
        req.files.map(f => uploadToCloudinary(f.buffer))
      );
      req.files = req.files.map((f, i) => ({
        ...f,
        path:         results[i].secure_url,
        cloudinaryId: results[i].public_id,
      }));
      next();
    } catch (err) {
      next(ApiError.internal("Image upload failed: " + err.message));
    }
  },
];

module.exports = { uploadSingle, uploadMultiple, uploadToCloudinary };