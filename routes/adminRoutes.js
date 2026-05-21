const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Order = require('../models/Order');
const User = require('../models/User');
const { Restaurant } = require('../models/Restaurant');

// Admin-only guard
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin')
    return res.status(403).json({ success: false, message: 'Admin access required' });
  next();
};

// GET /api/admin/stats
router.get('/stats', authMiddleware, adminOnly, async (req, res) => {
  try {
    const [totalOrders, totalUsers, totalRestaurants, revenueData, recentOrders] = await Promise.all([
      Order.countDocuments(),
      User.countDocuments({ role: 'user' }),
      Restaurant.countDocuments(),
      Order.aggregate([{ $group: { _id: null, total: { $sum: '$totalAmount' } } }]),
      Order.find().sort({ createdAt: -1 }).limit(10)
        .populate('user', 'name email')
        .populate('restaurant', 'name'),
    ]);
    res.json({
      success: true,
      stats: {
        totalOrders,
        totalUsers,
        totalRestaurants,
        totalRevenue: revenueData[0]?.total || 0,
      },
      recentOrders,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/admin/orders
router.get('/orders', authMiddleware, adminOnly, async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 })
      .populate('user', 'name email')
      .populate('restaurant', 'name');
    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/admin/orders/:id/status
router.put('/orders/:id/status', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status, $push: { statusHistory: { status, note: 'Updated by admin' } } },
      { new: true }
    );
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;