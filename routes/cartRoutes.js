const express  = require("express");
const router   = express.Router();
const mongoose = require("mongoose");

// Named import — matches the refactored authMiddleware.js
const { authMiddleware } = require("../middleware/authMiddleware");
const User = require("../models/User");

// ── Helper ────────────────────────────────────────────────────────────────────
const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// ── GET /api/cart ─────────────────────────────────────────────────────────────
router.get("/", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select("cart")
      .populate("cart.menuItem",   "name price image")
      .populate("cart.restaurant", "name");

    return res.json({ success: true, cart: user?.cart || [] });
  } catch (err) {
    console.error("[GET /cart]", err);
    return res.status(500).json({ success: false, message: "Failed to fetch cart." });
  }
});

// ── POST /api/cart/add  — body: { menuItemId, restaurantId, quantity? } ────────
router.post("/add", authMiddleware, async (req, res) => {
  try {
    const { menuItemId, restaurantId, quantity = 1 } = req.body;

    // Input validation
    if (!menuItemId || !restaurantId)
      return res.status(400).json({ success: false, message: "menuItemId and restaurantId are required." });
    if (!isValidObjectId(menuItemId))
      return res.status(400).json({ success: false, message: "Invalid menuItemId." });
    if (!isValidObjectId(restaurantId))
      return res.status(400).json({ success: false, message: "Invalid restaurantId." });

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 1 || qty > 99)
      return res.status(400).json({ success: false, message: "Quantity must be between 1 and 99." });

    const user = await User.findById(req.user.id);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found." });

    // Clear cart if switching restaurants
    if (user.cart.length > 0 && user.cart[0].restaurant?.toString() !== restaurantId) {
      user.cart = [];
    }

    const existing = user.cart.find(i => i.menuItem?.toString() === menuItemId);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + qty, 99); // cap at 99
    } else {
      user.cart.push({ menuItem: menuItemId, restaurant: restaurantId, quantity: qty });
    }

    await user.save();
    return res.json({ success: true, cart: user.cart });
  } catch (err) {
    console.error("[POST /cart/add]", err);
    return res.status(500).json({ success: false, message: "Failed to add item to cart." });
  }
});

// ── PUT /api/cart/update  — body: { menuItemId, quantity } ────────────────────
// quantity = 0 removes the item
router.put("/update", authMiddleware, async (req, res) => {
  try {
    const { menuItemId, quantity } = req.body;

    if (!menuItemId)
      return res.status(400).json({ success: false, message: "menuItemId is required." });
    if (!isValidObjectId(menuItemId))
      return res.status(400).json({ success: false, message: "Invalid menuItemId." });
    if (quantity === undefined || quantity === null)
      return res.status(400).json({ success: false, message: "quantity is required." });

    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty < 0 || qty > 99)
      return res.status(400).json({ success: false, message: "Quantity must be between 0 and 99." });

    const user = await User.findById(req.user.id);
    if (!user)
      return res.status(404).json({ success: false, message: "User not found." });

    if (qty === 0) {
      user.cart = user.cart.filter(i => i.menuItem?.toString() !== menuItemId);
    } else {
      const existing = user.cart.find(i => i.menuItem?.toString() === menuItemId);
      if (!existing)
        return res.status(404).json({ success: false, message: "Item not found in cart." });
      existing.quantity = qty;
    }

    await user.save();
    return res.json({ success: true, cart: user.cart });
  } catch (err) {
    console.error("[PUT /cart/update]", err);
    return res.status(500).json({ success: false, message: "Failed to update cart." });
  }
});

// ── DELETE /api/cart/clear ────────────────────────────────────────────────────
router.delete("/clear", authMiddleware, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { cart: [] });
    return res.json({ success: true, cart: [] });
  } catch (err) {
    console.error("[DELETE /cart/clear]", err);
    return res.status(500).json({ success: false, message: "Failed to clear cart." });
  }
});

module.exports = router;