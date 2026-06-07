const express  = require('express');
const router   = express.Router();
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

const Order      = require('../models/Order');
const User       = require('../models/User');
const { Restaurant } = require('../models/Restaurant');

const {
  createRestaurant, updateRestaurant, deleteRestaurant,
  addMenuItem, updateMenuItem, deleteMenuItem,
} = require('../controllers/restaurantController');

const adminGuard     = [authMiddleware, requireRole('admin')];
const VALID_STATUSES = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];

// ── GET /api/admin/stats ──────────────────────────────────────────────────────
router.get('/stats', adminGuard, async (req, res) => {
  try {
    const [totalOrders, totalUsers, totalRestaurants, revenueData, recentOrders] = await Promise.all([
      Order.countDocuments(),
      User.countDocuments({ role: 'user' }),
      Restaurant.countDocuments(),
      Order.aggregate([
        { $match: { status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      Order.find()
        .sort({ createdAt: -1 }).limit(10)
        .populate('user', 'name email')
        .populate('restaurant', 'name')
        .lean(),
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

// ── GET /api/admin/orders ─────────────────────────────────────────────────────
router.get('/orders', adminGuard, async (req, res) => {
  try {
    const page   = Math.max(1, parseInt(req.query.page)  || 1);
    const limit  = Math.min(100, parseInt(req.query.limit) || 20);
    const skip   = (page - 1) * limit;
    const filter = {};
    if (req.query.status) {
      if (!VALID_STATUSES.includes(req.query.status))
        return res.status(400).json({ success: false, message: 'Invalid status.' });
      filter.status = req.query.status;
    }
    const [orders, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit)
        .populate('user', 'name email').populate('restaurant', 'name').lean(),
      Order.countDocuments(filter),
    ]);
    return res.json({
      success: true,
      orders,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
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
    if (!status || !VALID_STATUSES.includes(status))
      return res.status(400).json({
        success: false,
        message: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}.`,
      });
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { status, $push: { statusHistory: { status, changedBy: req.user.id, note: 'Updated by admin', at: new Date() } } },
      { new: true, runValidators: true }
    ).populate('user', 'name email').populate('restaurant', 'name');
    if (!order)
      return res.status(404).json({ success: false, message: 'Order not found.' });
    return res.json({ success: true, order });
  } catch (err) {
    console.error('[PUT /admin/orders/:id/status]', err);
    return res.status(500).json({ success: false, message: 'Failed to update order status.' });
  }
});

// ── GET /api/admin/restaurants ────────────────────────────────────────────────
router.get('/restaurants', adminGuard, async (req, res) => {
  try {
    const restaurants = await Restaurant.find().sort({ createdAt: -1 });
    return res.json({ success: true, restaurants });
  } catch (err) {
    console.error('[GET /admin/restaurants]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch restaurants.' });
  }
});

// ── POST /api/admin/restaurants ───────────────────────────────────────────────
router.post('/restaurants', adminGuard, createRestaurant);

// ── PUT /api/admin/restaurants/:id ────────────────────────────────────────────
router.put('/restaurants/:id', adminGuard, updateRestaurant);

// ── DELETE /api/admin/restaurants/:id ─────────────────────────────────────────
router.delete('/restaurants/:id', adminGuard, deleteRestaurant);

// ── POST /api/admin/restaurants/:id/menu ──────────────────────────────────────
router.post('/restaurants/:id/menu', adminGuard, addMenuItem);

// ── PUT /api/admin/restaurants/:id/menu/:itemId ───────────────────────────────
router.put('/restaurants/:id/menu/:itemId', adminGuard, updateMenuItem);

// ── DELETE /api/admin/restaurants/:id/menu/:itemId ────────────────────────────
router.delete('/restaurants/:id/menu/:itemId', adminGuard, deleteMenuItem);

module.exports = router;