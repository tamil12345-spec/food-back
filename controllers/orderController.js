const Order = require('../models/Order');

// POST /api/orders
const createOrder = async (req, res) => {
  try {
    const { restaurantId, items, totalAmount, deliveryFee, deliveryAddress, paymentMethod, paymentStatus } = req.body;

    if (!restaurantId || !items?.length)
      return res.status(400).json({ success: false, message: 'restaurantId and items are required' });

    const order = await Order.create({
      user: req.user.id,
      restaurant: restaurantId,
      items,
      totalAmount,
      deliveryFee,
      deliveryAddress,
      paymentMethod,
      paymentStatus: paymentStatus || 'pending',
      status: 'confirmed',
      statusHistory: [{ status: 'confirmed', note: 'Order placed' }],
    });

    res.status(201).json({ success: true, order });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
};

// GET /api/orders/my-orders
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.id })
      .populate('restaurant', 'name image deliveryTime')
      .sort({ createdAt: -1 });

    res.json({ success: true, orders });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders' });
  }
};

// GET /api/orders/:id
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({ _id: req.params.id, user: req.user.id })
      .populate('restaurant', 'name image deliveryTime');

    if (!order)
      return res.status(404).json({ success: false, message: 'Order not found' });

    res.json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch order' });
  }
};

module.exports = { createOrder, getMyOrders, getOrderById };