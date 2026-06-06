const jwt  = require("jsonwebtoken");
const User = require("../models/User");

// ── Token helper ──────────────────────────────────────────────────────────────
const signToken = (user) =>
  jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET || "secret123",
    { expiresIn: "7d" }
  );

// ── Shared safe user shape (never expose password hash) ───────────────────────
const safeUser = (user) => ({
  id:      user._id,
  name:    user.name,
  email:   user.email,
  role:    user.role,
  phone:   user.phone   ?? null,
  address: user.address ?? {},
});

// ── Validation helpers ────────────────────────────────────────────────────────
const EMAIL_RE    = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HAS_UPPER   = /[A-Z]/;
const HAS_LOWER   = /[a-z]/;
const HAS_DIGIT   = /[0-9]/;
const HAS_SPECIAL = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/;

function validateRegisterInput({ name, email, password }) {
  const errors = {};
  if (!name?.trim())                   errors.name = "Full name is required.";
  else if (name.trim().length < 2)     errors.name = "Name must be at least 2 characters.";
  else if (name.trim().length > 60)    errors.name = "Name must be under 60 characters.";

  if (!email?.trim())                  errors.email = "Email is required.";
  else if (!EMAIL_RE.test(email.trim())) errors.email = "Please enter a valid email address.";

  if (!password)                       errors.password = "Password is required.";
  else if (password.length < 8)        errors.password = "Password must be at least 8 characters.";
  else if (password.length > 72)       errors.password = "Password must be under 72 characters.";
  else if (
    !HAS_UPPER.test(password) || !HAS_LOWER.test(password) ||
    !HAS_DIGIT.test(password) || !HAS_SPECIAL.test(password)
  ) errors.password = "Must include uppercase, lowercase, number & special character.";

  return errors;
}

function validateLoginInput({ email, password }) {
  const errors = {};
  if (!email?.trim())                    errors.email    = "Email is required.";
  else if (!EMAIL_RE.test(email.trim())) errors.email    = "Please enter a valid email address.";
  if (!password)                         errors.password = "Password is required.";
  else if (password.length < 8)          errors.password = "Password must be at least 8 characters.";
  return errors;
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const errors = validateRegisterInput({ name, email, password });
    if (Object.keys(errors).length > 0)
      return res.status(422).json({ success: false, errors });

    const existing = await User.findOne({ email: email.trim().toLowerCase() });
    if (existing)
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists.",
        errors: { email: "An account with this email already exists." },
      });

    const user = await User.create({
      name:     name.trim(),
      email:    email.trim().toLowerCase(),
      password,
      role:     "user",
    });

    const token = signToken(user);
    return res.status(201).json({ success: true, token, user: safeUser(user) });
  } catch (err) {
    console.error("[register]", err);
    return res.status(500).json({ success: false, message: "Registration failed. Please try again." });
  }
};

// ── POST /api/auth/login ──────────────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const errors = validateLoginInput({ email, password });
    if (Object.keys(errors).length > 0)
      return res.status(422).json({ success: false, errors });

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !(await user.comparePassword(password)))
      return res.status(401).json({ success: false, message: "Invalid email or password." });

    const token = signToken(user);
    return res.json({ success: true, token, user: safeUser(user) });
  } catch (err) {
    console.error("[login]", err);
    return res.status(500).json({ success: false, message: "Login failed. Please try again." });
  }
};

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user)
      return res.status(404).json({ success: false, message: "User not found." });

    return res.json({ success: true, user: safeUser(user) });
  } catch (err) {
    console.error("[getMe]", err);
    return res.status(500).json({ success: false, message: "Failed to fetch user." });
  }
};

// ── PUT /api/auth/profile ─────────────────────────────────────────────────────
const updateProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;

    // Only update fields that were actually sent
    const updates = {};
    if (name !== undefined) {
      if (!name.trim())              return res.status(400).json({ success: false, errors: { name: "Name is required." } });
      if (name.trim().length < 2)    return res.status(400).json({ success: false, errors: { name: "Name must be at least 2 characters." } });
      if (name.trim().length > 60)   return res.status(400).json({ success: false, errors: { name: "Name must be under 60 characters." } });
      updates.name = name.trim();
    }
    if (phone !== undefined) {
      if (phone && !/^[\+]?[\d\s\-\(\)]{7,15}$/.test(phone.trim()))
        return res.status(400).json({ success: false, errors: { phone: "Please enter a valid phone number." } });
      updates.phone = phone?.trim() || null;
    }
    if (address !== undefined) {
      updates.address = {
        street: address.street?.trim() || '',
        city:   address.city?.trim()   || '',
        state:  address.state?.trim()  || '',
        zip:    address.zip?.trim()    || '',
      };
    }

    if (Object.keys(updates).length === 0)
      return res.status(400).json({ success: false, message: "No fields provided to update." });

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updates,
      { new: true, runValidators: true }
    ).select("-password");

    if (!user)
      return res.status(404).json({ success: false, message: "User not found." });

    return res.json({ success: true, user: safeUser(user) });
  } catch (err) {
    console.error("[updateProfile]", err);
    return res.status(500).json({ success: false, message: "Failed to update profile." });
  }
};

// ── DELETE /api/auth/account ──────────────────────────────────────────────────
const deleteAccount = async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.user.id);
    if (!deleted)
      return res.status(404).json({ success: false, message: "User not found." });

    return res.json({ success: true, message: "Account deleted." });
  } catch (err) {
    console.error("[deleteAccount]", err);
    return res.status(500).json({ success: false, message: "Failed to delete account." });
  }
};

module.exports = { register, login, getMe, updateProfile, deleteAccount };