const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

dotenv.config();

const validateEnv = require("./config/validateEnv");
validateEnv();

const connectDB = require("./config/db");
connectDB();

/* Route imports */
const authRoutes = require("./routes/auth.routes");
const productRoutes = require("./routes/product.routes");
const orderRoutes = require("./routes/order.routes");
const paymentRoutes = require("./routes/paymentRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
// Safe-load new routes so a missing file doesn't crash the whole server
let supportRoutes, reviewRoutes;
try { supportRoutes = require("./routes/support.routes"); } catch (e) { console.warn("support.routes.js not found — skipping"); }
try { reviewRoutes = require("./routes/review.routes"); } catch (e) { console.warn("review.routes.js not found — skipping"); }

/* Middleware imports */
const notFound = require("./middlewares/notFoundMiddleware");
const errorHandler = require("./middlewares/errorMiddleware");

const app = express();

/* ── Security headers ──
 * This server is API-only (the React frontend is a separate app), so the
 * default Content-Security-Policy — meant for pages that render HTML —
 * isn't relevant here and is turned off. The rest of Helmet's defaults
 * (X-Content-Type-Options, X-Frame-Options, hiding X-Powered-By, HSTS,
 * etc.) still apply and are good practice for any Express API. */
app.use(helmet({
  contentSecurityPolicy: false,
}));

/* ── CORS ── */
const allowedOrigins = [
  process.env.CLIENT_URL || "http://localhost:3000",
  "http://localhost:3000",
  "http://localhost:5173",
];

app.use(cors({
  origin: (origin, callback) => {
    /* Allow requests with no origin (mobile apps, curl, Postman) */
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked: ${origin}`));
    }
  },
  credentials: true,
}));

/* ── Stripe webhook MUST use raw body — mount BEFORE express.json() ── */
app.use(
  "/api/payment/webhook",
  express.raw({ type: "application/json" })
);

/* ── Body parsers ── */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* ── Rate limiting ── */
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { type: "error", message: "Too many requests, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

/* Stricter limit on auth routes to prevent brute force */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { type: "error", message: "Too many login attempts, please try again in 15 minutes." },
});

app.use("/api", limiter);
app.use("/api/auth/login", authLimiter);

/* ── Health check ── */
app.get("/", (req, res) => {
  res.json({ message: "Mublat API is running 🍞", env: process.env.NODE_ENV });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

/* ── Routes ── */
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/upload", uploadRoutes);
if (supportRoutes) app.use("/api/support", supportRoutes);
if (reviewRoutes) app.use("/api/reviews", reviewRoutes);

/* ── 404 handler — must be after all routes ── */
app.use(notFound);

/* ── Global error handler — must be last and have 4 params ── */
app.use(errorHandler);

/* ── Start ── */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Mublat server running on port ${PORT} [${process.env.NODE_ENV || "development"}]`);
});