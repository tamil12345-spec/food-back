const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

// Warn at startup if falling back to the insecure default
if (!JWT_SECRET) {
  console.warn(
    "[authMiddleware] WARNING: JWT_SECRET is not set. " +
    "Using insecure default — set JWT_SECRET in your environment."
  );
}

function authMiddleware(req, res, next) {
  // ── 1. Extract token ────────────────────────────────────────────────────────
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ success: false, message: "Unauthorized: no token provided." });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ success: false, message: "Unauthorized: malformed token." });
  }

  // ── 2. Verify ───────────────────────────────────────────────────────────────
  try {
    const decoded = jwt.verify(token, JWT_SECRET || "secret123");

    // Ensure the token carries the expected fields before trusting it
    if (!decoded?.id || !decoded?.role) {
      return res.status(401).json({ success: false, message: "Unauthorized: invalid token payload." });
    }

    req.user = decoded; // { id, email, role, iat, exp }
    next();

  } catch (err) {
    // Distinguish expired tokens from tampered/malformed ones
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Session expired. Please sign in again." });
    }
    return res.status(401).json({ success: false, message: "Unauthorized: invalid token." });
  }
}

// ── Role guard factory ────────────────────────────────────────────────────────
// Usage: router.get('/admin/stats', authMiddleware, requireRole('admin'), handler)
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: requires role ${roles.join(" or ")}.`,
      });
    }
    next();
  };
}

module.exports = { authMiddleware, requireRole };