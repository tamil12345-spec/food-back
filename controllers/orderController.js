const { orders } = require("../config/db");

// POST /api/orders
const createOrder = (req, res) => {
  const { restaurantId, items, total, address } = req.body;

  if (!restaurantId || !items?.length)
    return res.status(400).json({ success: false, message: "restaurantId and items are required" });

  const order = {
    _id: Date.now().toString(),
    userId: req.user.id,
    restaurantId,
    items,
    total,
    address,
    status: "pending",
    createdAt: new Date(),
  };
  orders.push(order);
  res.status(201).json({ success: true, order });
};

// GET /api/orders/my-orders
const getMyOrders = (req, res) => {
  const myOrders = orders.filter((o) => o.userId === req.user.id);
  res.json({ success: true, orders: myOrders });
};

// GET /api/orders/:id
const getOrderById = (req, res) => {
  const order = orders.find((o) => o._id === req.params.id && o.userId === req.user.id);
  if (!order)
    return res.status(404).json({ success: false, message: "Order not found" });
  res.json({ success: true, order });
};

module.exports = { createOrder, getMyOrders, getOrderById };
