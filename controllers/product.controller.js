const Product = require("../models/Product");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");

/* GET /api/products?page=1&limit=20&category=Pastries&search=pie&active=true */
const getProducts = asyncHandler(async (req, res) => {
  const { category, search, active, page = 1, limit = 50 } = req.query;

  const filter = {};

  if (category) filter.category = category;

  if (active !== undefined) {
    filter.active = active === "true";
  }

  if (search) {
    filter.$or = [
      {
        name: {
          $regex: search,
          $options: "i",
        },
      },
      {
        description: {
          $regex: search,
          $options: "i",
        },
      },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);

  const total = await Product.countDocuments(filter);

  const products = await Product.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  res.json({
    type: "success",
    total,
    page: Number(page),
    totalPages: Math.ceil(total / Number(limit)),
    products,
  });
});

/* GET /api/products/:id */
const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw ApiError.notFound("Product not found");
  }

  res.json({
    type: "success",
    product,
  });
});

/* POST /api/products */
const createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);

  res.status(201).json({
    type: "success",
    message: "Product created successfully",
    product,
  });
});

/* PUT /api/products/:id */
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    req.body,
    {
      returnDocument: "after",
      runValidators: true,
    }
  );

  if (!product) {
    throw ApiError.notFound("Product not found");
  }

  res.json({
    type: "success",
    message: "Product updated successfully",
    product,
  });
});

/* DELETE /api/products/:id */
const deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);

  if (!product) {
    throw ApiError.notFound("Product not found");
  }

  res.json({
    type: "success",
    message: "Product deleted successfully",
  });
});

/* PATCH /api/products/:id/toggle */
const toggleProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw ApiError.notFound("Product not found");
  }

  product.active = !product.active;

  await product.save();

  res.json({
    type: "success",
    message: `Product ${product.active ? "activated" : "deactivated"}`,
    product,
  });
});

/* PATCH /api/products/:id/activate */
const activateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw ApiError.notFound("Product not found");
  }

  if (!product.active) {
    product.active = true;
    await product.save();
  }

  res.json({
    type: "success",
    message: "Product activated",
    product,
  });
});

/* PATCH /api/products/:id/deactivate */
const deactivateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw ApiError.notFound("Product not found");
  }

  if (product.active) {
    product.active = false;
    await product.save();
  }

  res.json({
    type: "success",
    message: "Product deactivated",
    product,
  });
});

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProduct,
  activateProduct,
  deactivateProduct,
};