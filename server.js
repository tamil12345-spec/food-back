const express  = require("express");
const cors     = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

// ── Fail fast if critical env vars are missing ────────────────────────────────
const REQUIRED_ENV = ["MONGODB_URI", "JWT_SECRET"];
const missing = REQUIRED_ENV.filter(k => !process.env[k]);
if (missing.length > 0) {
  console.error(`[server] Missing required environment variables: ${missing.join(", ")}`);
  process.exit(1);
}

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
// Restrict to known origins in production; open in development
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(o => o.trim())
  : ["http://localhost:3000"];

app.use(cors({
  origin: (origin, cb) => {
    // Allow server-to-server / curl requests (no origin) in non-production
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin "${origin}" not allowed`));
  },
  credentials: true,
}));

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: "50kb" })); // prevent oversized payloads

// ── Health check (Render, UptimeRobot, etc.) ──────────────────────────────────
app.get("/health", (req, res) =>
  res.json({ status: "ok", uptime: process.uptime(), env: process.env.NODE_ENV })
);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api/auth",        require("./routes/authRoutes"));
app.use("/api/cart",        require("./routes/cartRoutes"));
app.use("/api/restaurants", require("./routes/restaurantRoutes"));
app.use("/api/orders",      require("./routes/orderRoutes"));
app.use("/api/payments",    require("./routes/paymentRoutes"));
app.use("/api/admin",       require("./routes/adminRoutes"));

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` });
});

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("[server] Unhandled error:", err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: process.env.NODE_ENV === "production"
      ? "An unexpected error occurred."
      : err.message,
  });
});

// ── MongoDB + auto-seed ───────────────────────────────────────────────────────
async function seedAdmin() {
  const User   = require("./models/User");
  const bcrypt = require("bcryptjs");

  const adminExists = await User.findOne({ role: "admin" });
  if (!adminExists) {
    // Password is hashed by User model's pre-save hook —
    // pass plain text here; bcrypt.hash call is redundant and double-hashes.
    await User.create({
      name:     "Super Admin",
      email:    "admin@foodapp.com",
      password: "Admin@9876!",   // hashed once by pre-save hook
      role:     "admin",
    });
    console.log("✅ Admin user seeded: admin@foodapp.com / Admin@9876!");
  }
}

async function startServer() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected");

    await seedAdmin();

    const PORT = process.env.PORT || 5000;
    app.listen(PORT, () =>
      console.log(`✅ Server running on port ${PORT} [${process.env.NODE_ENV || "development"}]`)
    );
  } catch (err) {
    console.error("[server] Startup failed:", err);
    process.exit(1);
  }
}

startServer();