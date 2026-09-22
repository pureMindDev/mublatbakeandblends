const ORDER_STATUSES = [
  "Pending",
  "Preparing",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

const PRODUCT_CATEGORIES = ["Pastries", "Drinks", "Other"];

const DELIVERY_METHODS = ["Delivery", "Pickup"];

const DELIVERY_FEE = 3.50;

// Payment confirmation state — only an admin can move an order from
// "Pending" to "Paid" (see order.controller.updateOrderPayment).
const PAYMENT_STATUSES = ["Pending", "Paid"];

// Single source of truth for bank transfer details, used by the checkout
// success page (via the public order endpoint) and by transactional emails.
// Update these before going live.
const BANK_DETAILS = {
  accountName: "Barakat Badmus",
  bankName: "Monzo Bank",
  sortCode: "04-00-03",
  accountNumber: "21024596",
};

const MAX_IMAGES_PER_PRODUCT = 3;

const IMAGE_ALLOWED_FORMATS = ["jpg", "jpeg", "png", "webp"];

const IMAGE_MAX_SIZE_MB = 5;

// Where new-order notifications and support form submissions are sent.
// The ADMIN_EMAIL environment variable always wins if it's set — this is
// only the fallback used when that variable is missing/blank on the
// deployed server, so admin notifications never silently go nowhere.
const ADMIN_EMAIL = process.env.ADMIN_EMAIL && process.env.ADMIN_EMAIL.trim() !== ""
  ? process.env.ADMIN_EMAIL.trim()
  : "mublatbakeandblends@gmail.com";

module.exports = {
  ORDER_STATUSES,
  PRODUCT_CATEGORIES,
  DELIVERY_METHODS,
  DELIVERY_FEE,
  MAX_IMAGES_PER_PRODUCT,
  IMAGE_ALLOWED_FORMATS,
  IMAGE_MAX_SIZE_MB,
  PAYMENT_STATUSES,
  BANK_DETAILS,
  ADMIN_EMAIL,
};
