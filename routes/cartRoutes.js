const express        = require("express");
const router         = express.Router();
const authMiddleware = require("../middleware/authMiddleware");
const User           = require("../models/User");

// GET /cart
router.get("/", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("cart");
    res.json({ success: true, cart: user?.cart || [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /cart/add  — body: { menuItemId, restaurantId, quantity? }
router.post("/add", authMiddleware, async (req, res) => {
  console.log("CART ADD BODY:", req.body);
  try {
    
    const { menuItemId, restaurantId, quantity = 1 } = req.body;
    if (!menuItemId || !restaurantId)
      return res.status(400).json({ success: false, message: "menuItemId and restaurantId are required" });

    const user = await User.findById(req.user.id);

    // If cart has items from a different restaurant, clear it first
    if (user.cart.length > 0 && user.cart[0].restaurant?.toString() !== restaurantId) {
      user.cart = [];
    }

    const existing = user.cart.find(i => i.menuItem?.toString() === menuItemId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      user.cart.push({ menuItem: menuItemId, restaurant: restaurantId, quantity });
    }

    await user.save();
    res.json({ success: true, cart: user.cart });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /cart/update  — body: { menuItemId, quantity }
// quantity = 0 removes the item
router.put("/update", authMiddleware, async (req, res) => {
  try {
    const { menuItemId, quantity } = req.body;
    const user = await User.findById(req.user.id);

    if (quantity <= 0) {
      user.cart = user.cart.filter(i => i.menuItem?.toString() !== menuItemId);
    } else {
      const existing = user.cart.find(i => i.menuItem?.toString() === menuItemId);
      if (existing) existing.quantity = quantity;
    }

    await user.save();
    res.json({ success: true, cart: user.cart });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /cart/clear
router.delete("/clear", authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { cart: [] });
    res.json({ success: true, cart: [] });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
