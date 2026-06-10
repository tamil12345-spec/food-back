const Order      = require('../models/Order');
const User       = require('../models/User');

// ── Allowed payment methods ───────────────────────────────────────────────────
const VALID_PAYMENT_METHODS = ['card', 'upi', 'netbanking', 'wallet', 'cod', 'razorpay'];
const VALID_STATUSES        = ['pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];

// ── Estimated delivery helper ─────────────────────────────────────────────────
function estimatedDelivery(createdAt, deliveryTime) {
  // deliveryTime is a string like "30-45 min" — parse the upper bound
  const match = deliveryTime?.match(/(\d+)-(\d+)/);
  const mins  = match ? parseInt(match[2]) : 45;
  return new Date(new Date(createdAt).getTime() + mins * 60 * 1000);
}

// ── POST /api/orders ──────────────────────────────────────────────────────────
const createOrder = async (req, res) => {
  try {
    // Block admins from placing orders
    if (req.user.role === 'admin')
      return res.status(403).json({ success: false, message: 'Admins cannot place orders.' });

    const {
      restaurantId, items, totalAmount, deliveryFee,
      deliveryAddress, paymentMethod, paymentStatus,
    } = req.body;

    // Input validation
    if (!restaurantId)
      return res.status(400).json({ success: false, message: 'restaurantId is required.' });
    if (!items?.length)
      return res.status(400).json({ success: false, message: 'Order must contain at least one item.' });
    if (!deliveryAddress?.street && !deliveryAddress?.city)
      return res.status(400).json({ success: false, message: 'Delivery address is required.' });
    if (paymentMethod && !VALID_PAYMENT_METHODS.includes(paymentMethod))
      return res.status(400).json({ success: false, message: `Invalid payment method. Must be one of: ${VALID_PAYMENT_METHODS.join(', ')}.` });

    const now = new Date();

    const order = await Order.create({
      user:            req.user.id,
      restaurant:      restaurantId,
      items,
      totalAmount,
      deliveryFee,
      deliveryAddress,
      paymentMethod:   paymentMethod || 'cod',
      paymentStatus:   paymentStatus || 'pending',
      status:          'confirmed',
      orderedAt:       now,
      estimatedDeliveryAt: estimatedDelivery(now, req.body.deliveryTime),
      statusHistory: [{
        status:    'confirmed',
        note:      'Order placed successfully',
        changedAt: now,
      }],
    });

    // Clear the user's cart after successful order
    await User.findByIdAndUpdate(req.user.id, { cart: [] });

    const populated = await order.populate('restaurant', 'name image deliveryTime');
    return res.status(201).json({ success: true, order: populated });
  } catch (err) {
    console.error('[createOrder]', err);
    return res.status(500).json({ success: false, message: 'Failed to create order.' });
  }
};

// ── GET /api/orders/my-orders ─────────────────────────────────────────────────
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate('restaurant', 'name image deliveryTime')
      .sort({ createdAt: -1 });

    return res.json({ success: true, orders });
  } catch (err) {
    console.error('[getMyOrders]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch orders.' });
  }
};

// ── GET /api/orders/:id ───────────────────────────────────────────────────────
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id })
      .populate('restaurant', 'name image deliveryTime address');

    if (!order)
      return res.status(404).json({ success: false, message: 'Order not found.' });

    return res.json({ success: true, order });
  } catch (err) {
    console.error('[getOrderById]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch order.' });
  }
};

// ── POST /api/orders/:id/cancel ───────────────────────────────────────────────
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id })
      .populate('restaurant', 'name');

    if (!order)
      return res.status(404).json({ success: false, message: 'Order not found.' });

    // Only allow cancellation if order hasn't been picked up yet
    const nonCancellable = ['out_for_delivery', 'delivered', 'cancelled'];
    if (nonCancellable.includes(order.status))
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled — it is already ${order.status.replace(/_/g, ' ')}.`,
      });

    const { reason = 'Cancelled by customer' } = req.body;

    order.status       = 'cancelled';
    order.cancelledAt  = new Date();
    order.cancelReason = reason;
    order.statusHistory.push({
      status:    'cancelled',
      note:      reason,
      changedAt: new Date(),
    });

    await order.save();

    return res.json({
      success: true,
      message: 'Order cancelled successfully.',
      order,
    });
  } catch (err) {
    console.error('[cancelOrder]', err);
    return res.status(500).json({ success: false, message: 'Failed to cancel order.' });
  }
};

module.exports = { createOrder, getMyOrders, getOrderById, cancelOrder };