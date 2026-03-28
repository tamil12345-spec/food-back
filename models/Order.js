const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
  items: [{
    name: String,
    price: Number,
    quantity: Number,
    image: String,
  }],
  totalAmount: { type: Number, required: true },
  deliveryFee: { type: Number, default: 2.99 },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'],
    default: 'pending',
  },
  paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
  paymentIntentId: { type: String },
  deliveryAddress: {
    street: String,
    city: String,
    state: String,
    zip: String,
  },
  estimatedDelivery: { type: Date },
  statusHistory: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    note: String,
  }],
}, { timestamps: true });

module.exports = mongoose.model('Order', orderSchema);
