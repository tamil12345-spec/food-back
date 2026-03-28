const express = require('express');
const Order = require('../models/Order');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const router = express.Router();

// Create order
router.post('/', protect, async (req, res) => {
  try {
    const { restaurantId, items, totalAmount, deliveryFee, deliveryAddress, paymentStatus } = req.body;

    const order = await Order.create({
      user: req.user._id,
      restaurant: restaurantId,
      items,
      totalAmount,
      deliveryFee,
      deliveryAddress,
      paymentStatus,
      status: 'confirmed',
      estimatedDelivery: new Date(Date.now() + 45 * 60 * 1000),
      statusHistory: [{ status: 'confirmed', note: 'Order placed successfully' }],
    });

    // Clear user cart
    await User.findByIdAndUpdate(req.user._id, { cart: [] });

    res.status(201).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get user orders
router.get('/my-orders', protect, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('restaurant', 'name image')
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get single order
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('restaurant', 'name image address phone')
      .populate('user', 'name email');

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.user._id.toString() !== req.user._id.toString() && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Not authorized' });

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
