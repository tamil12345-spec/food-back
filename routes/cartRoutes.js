const express        = require("express");
const router         = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

// In-memory cart: { [userId]: [{ menuItem, restaurant, quantity }] }
const carts = {};

// GET /cart
router.get("/", authMiddleware, (req, res) => {
  const cart = carts[req.user.id] || [];
  res.json({ success: true, cart });
});

// POST /cart/add  — body: { menuItemId, restaurantId, quantity? }
router.post("/add", authMiddleware, (req, res) => {
  const { menuItemId, restaurantId, quantity = 1 } = req.body;
  if (!menuItemId || !restaurantId)
    return res.status(400).json({ success: false, message: "menuItemId and restaurantId are required" });

  if (!carts[req.user.id]) carts[req.user.id] = [];
  const cart = carts[req.user.id];

  // If cart has items from a different restaurant, clear it first
  if (cart.length > 0 && cart[0].restaurant !== restaurantId) {
    carts[req.user.id] = [];
  }

  const existing = carts[req.user.id].find(i => i.menuItem === menuItemId);
  if (existing) {
    existing.quantity += quantity;
  } else {
    carts[req.user.id].push({ menuItem: menuItemId, restaurant: restaurantId, quantity });
  }

  res.json({ success: true, cart: carts[req.user.id] });
});

// PUT /cart/update  — body: { menuItemId, quantity }
// quantity = 0 removes the item
router.put("/update", authMiddleware, (req, res) => {
  const { menuItemId, quantity } = req.body;
  if (!carts[req.user.id]) carts[req.user.id] = [];

  if (quantity <= 0) {
    carts[req.user.id] = carts[req.user.id].filter(i => i.menuItem !== menuItemId);
  } else {
    const existing = carts[req.user.id].find(i => i.menuItem === menuItemId);
    if (existing) existing.quantity = quantity;
  }

  res.json({ success: true, cart: carts[req.user.id] });
});

// DELETE /cart/clear
router.delete("/clear", authMiddleware, (req, res) => {
  carts[req.user.id] = [];
  res.json({ success: true, cart: [] });
});

module.exports = router;