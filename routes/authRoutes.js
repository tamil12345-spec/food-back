const express  = require("express");
const router   = express.Router();

const { register, login, getMe, deleteAccount, updateProfile } = require("../controllers/authController");

// Named export — updated to match the refactored authMiddleware.js
const { authMiddleware } = require("../middleware/authMiddleware");

// ── Public routes ─────────────────────────────────────────────────────────────
router.post("/register", register);
router.post("/login",    login);

// ── Protected routes ──────────────────────────────────────────────────────────
router.get("/me",           authMiddleware, getMe);
router.put("/profile",      authMiddleware, updateProfile);
router.delete("/account",   authMiddleware, deleteAccount);

module.exports = router;