const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

// ── Address sub-schema ────────────────────────────────────────────────────────
const addressSchema = new mongoose.Schema({
  street: { type: String, trim: true },
  city:   { type: String, trim: true },
  state:  { type: String, trim: true, uppercase: true },
  zip:    { type: String, trim: true },
}, { _id: false }); // no separate _id for embedded sub-doc

// ── Cart item sub-schema ──────────────────────────────────────────────────────
const cartItemSchema = new mongoose.Schema({
  menuItem:   { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  quantity:   { type: Number, default: 1, min: 1, max: 99 },
}, { _id: false });

// ── User schema ───────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name: {
    type:     String,
    required: [true, 'Name is required.'],
    trim:     true,
    minlength: [2,  'Name must be at least 2 characters.'],
    maxlength: [60, 'Name must be under 60 characters.'],
  },
  email: {
    type:      String,
    required:  [true, 'Email is required.'],
    unique:    true,
    lowercase: true,
    trim:      true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address.'],
  },
  password: {
    type:      String,
    required:  [true, 'Password is required.'],
    minlength: [8, 'Password must be at least 8 characters.'], // was 6 — matches frontend/authController
  },
  role: {
    type:    String,
    enum:    ['user', 'admin'],
    default: 'user',
  },
  phone: {
    type:  String,
    trim:  true,
    match: [/^[\+]?[\d\s\-\(\)]{7,15}$/, 'Please enter a valid phone number.'],
    default: null,
  },
  address: {
    type:    addressSchema,
    default: () => ({}),
  },
  cart: {
    type:    [cartItemSchema],
    default: [],
  },
}, { timestamps: true });

// ── Indexes ───────────────────────────────────────────────────────────────────
// email uniqueness is handled by the unique:true above (creates an index).
// Add a sparse index on phone so null values don't collide.
userSchema.index({ phone: 1 }, { sparse: true });

// ── Pre-save: hash password only when modified ────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    this.password = await bcrypt.hash(this.password, 12);
    next();
  } catch (err) {
    next(err); // surface hashing errors instead of silently hanging
  }
});

// ── Instance method: verify password ─────────────────────────────────────────
userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

// ── Instance method: safe public shape (never expose hash) ───────────────────
userSchema.methods.toSafeObject = function () {
  return {
    id:      this._id,
    name:    this.name,
    email:   this.email,
    role:    this.role,
    phone:   this.phone,
    address: this.address,
  };
};

module.exports = mongoose.model('User', userSchema);