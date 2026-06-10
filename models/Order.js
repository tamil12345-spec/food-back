const mongoose = require('mongoose');

// ── Status history sub-schema ─────────────────────────────────────────────────
const statusHistorySchema = new mongoose.Schema({
  status:    { type: String, required: true },
  note:      { type: String, default: '' },
  changedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  changedAt: { type: Date, default: Date.now },
}, { _id: false });

// ── Order item sub-schema ─────────────────────────────────────────────────────
const orderItemSchema = new mongoose.Schema({
  menuItem:  { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', default: null },
  name:      { type: String, required: true },
  price:     { type: Number, required: true, min: 0 },
  quantity:  { type: Number, required: true, min: 1 },
  image:     { type: String, default: '' },
}, { _id: false });

// ── Order schema ──────────────────────────────────────────────────────────────
const orderSchema = new mongoose.Schema({
  user: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'User',
    required: true,
    index:    true,
  },
  restaurant: {
    type:     mongoose.Schema.Types.ObjectId,
    ref:      'Restaurant',
    required: true,
  },
  items: {
    type:     [orderItemSchema],
    validate: { validator: v => v.length > 0, message: 'Order must have at least one item.' },
  },

  // ── Amounts ─────────────────────────────────────────────────────────────────
  totalAmount: { type: Number, required: true, min: 0 },
  deliveryFee: { type: Number, default: 2.99,  min: 0 },

  // ── Status ──────────────────────────────────────────────────────────────────
  status: {
    type:    String,
    enum:    ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'pending',
    index:   true,
  },

  // ── Payment ─────────────────────────────────────────────────────────────────
  paymentMethod: {
    type:    String,
    enum:    ['card', 'upi', 'netbanking', 'wallet', 'cod', 'razorpay'],
    default: 'cod',
  },
  paymentStatus: {
    type:    String,
    enum:    ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending',
  },
  paymentIntentId: { type: String, default: null },

  // ── Address ──────────────────────────────────────────────────────────────────
  deliveryAddress: {
    street: { type: String, trim: true },
    city:   { type: String, trim: true },
    state:  { type: String, trim: true },
    zip:    { type: String, trim: true },
  },

  // ── Timestamps ───────────────────────────────────────────────────────────────
  orderedAt:           { type: Date, default: Date.now },
  estimatedDeliveryAt: { type: Date, default: null },   // was estimatedDelivery — renamed for clarity
  deliveredAt:         { type: Date, default: null },   // set when status → delivered
  cancelledAt:         { type: Date, default: null },   // set when status → cancelled
  cancelReason:        { type: String, default: null },

  // ── Status history ────────────────────────────────────────────────────────────
  statusHistory: {
    type:    [statusHistorySchema],
    default: [],
  },

}, { timestamps: true }); // createdAt + updatedAt from Mongoose

// ── Auto-set deliveredAt / cancelledAt on status change ──────────────────────
orderSchema.pre('save', function (next) {
  if (this.isModified('status')) {
    if (this.status === 'delivered'  && !this.deliveredAt)  this.deliveredAt  = new Date();
    if (this.status === 'cancelled'  && !this.cancelledAt)  this.cancelledAt  = new Date();
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);