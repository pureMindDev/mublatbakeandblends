const ORDER_STATUSES = [
  "Pending",
  "Preparing",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

const PRODUCT_CATEGORIES = ["Pastries", "Drinks"];

const DELIVERY_METHODS = ["Delivery", "Pickup"];

const DELIVERY_FEE = 3.50;

const MAX_IMAGES_PER_PRODUCT = 3;

const IMAGE_ALLOWED_FORMATS = ["jpg", "jpeg", "png", "webp"];

const IMAGE_MAX_SIZE_MB = 5;

module.exports = {
  ORDER_STATUSES,
  PRODUCT_CATEGORIES,
  DELIVERY_METHODS,
  DELIVERY_FEE,
  MAX_IMAGES_PER_PRODUCT,
  IMAGE_ALLOWED_FORMATS,
  IMAGE_MAX_SIZE_MB,
};
