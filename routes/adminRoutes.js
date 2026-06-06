const express = require('express');
const router  = express.Router();

// Updated import — authMiddleware is now a named export
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

const Order      = require('../models/Order');
const User       = require('../models/User');
const { Restaurant } = require('../models/Restaurant');

// Shorthand: every admin route requires auth + admin role
const adminGuard = [authMiddleware, requireRole('admin')];

const VALID_STATUSES = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
router.get('/stats', adminGuard, async (req, res) => {
  try {
    const [totalOrders, totalUsers, totalRestaurants, revenueData, recentOrders] = await Promise.all([
      Order.countDocuments(),
      User.countDocuments({ role: 'user' }),
      Restaurant.countDocuments(),
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } }, // exclude cancelled from revenue
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Order.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', 'name email')
        .populate('restaurant', 'name')
        .lean(), // plain JS objects — faster, no Mongoose overhead for read-only data
    ]);

    return res.json({
      success: true,
      stats: {
        totalOrders,
        totalUsers,
        totalRestaurants,
        totalRevenue: revenueData[0]?.total ?? 0,
      },
      recentOrders,
    });
  } catch (err) {
    console.error('[GET /admin/stats]', err);
    return res.status(500).json({ success: false, message: 'Failed to load stats.' });
  }
});

// ── GET /api/admin/orders?page=1&limit=20&status=pending ─────────────────────
router.get('/orders', adminGuard, async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 20);
    const skip   = (page - 1) * limit;

    // Optional status filter
    const filter = {};
    if (req.query.status) {
      if (!VALID_STATUSES.includes(req.query.status))
        return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}.` });
      filter.status = req.query.status;
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'name email')
        .populate('restaurant', 'name')
        .lean(),
      Order.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      orders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[GET /admin/orders]', err);
    return res.status(500).json({ success: false, message: 'Failed to load orders.' });
  }
});

// ── PUT /api/admin/orders/:id/status ─────────────────────────────────────────
router.put('/orders/:id/status', adminGuard, async (req, res) => {
  try {
    const { status } = req.body;

    // Validate status before touching the DB
    if (!status)
      return res.status(400).json({ success: false, message: 'Status is required.' });
    if (!VALID_STATUSES.includes(status))
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}.`,
      });

    const order = await Order.findByIdAndUpdate(
      req.params.id,
      {
        status,
        $push: {
          statusHistory: {
            status,
            changedBy: req.user.id,   // audit trail — who made the change
            note: 'Updated by admin',
            at: new Date(),
          },
        },
      },
      { new: true, runValidators: true }
    )
      .populate('user', 'name email')
      .populate('restaurant', 'name');

    if (!order)
      return res.status(404).json({ success: false, message: 'Order not found.' });

    return res.json({ success: true, order });
  } catch (err) {
    console.error('[PUT /admin/orders/:id/status]', err);
    return res.status(500).json({ success: false, message: 'Failed to update order status.' });
  }
});

module.exports = router;