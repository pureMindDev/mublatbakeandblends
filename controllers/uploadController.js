const cloudinary   = require("../config/cloudinary");
const asyncHandler = require("../utils/asyncHandler");
const ApiError     = require("../utils/ApiError");

/**
 * POST /api/upload/images
 * Accepts up to 3 images, returns their Cloudinary URLs.
 * Files are handled by uploadMiddleware (multer-storage-cloudinary).
 */
const uploadImages = asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw ApiError.badRequest("No images provided");
  }

  const urls = req.files.map((file) => file.path); // Cloudinary URL

  res.status(201).json({
    type:    "success",
    message: `${urls.length} image${urls.length > 1 ? "s" : ""} uploaded successfully`,
    urls,
  });
});

/**
 * DELETE /api/upload/image
 * Body: { publicId: "mublat/products/xyz" }
 * Deletes the image from Cloudinary.
 */
const deleteImage = asyncHandler(async (req, res) => {
  const { publicId } = req.body;

  if (!publicId) throw ApiError.badRequest("publicId is required");

  const result = await cloudinary.uploader.destroy(publicId);

  if (result.result !== "ok") {
    throw ApiError.badRequest("Image could not be deleted or was not found");
  }

  res.json({ type: "success", message: "Image deleted successfully" });
});

module.exports = { uploadImages, deleteImage };
