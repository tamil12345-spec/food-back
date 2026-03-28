const express = require('express');
const User = require('../models/User');
const { Restaurant } = require('../models/Restaurant');
const { protect } = require('../middleware/auth');
const router = express.Router();

// Get cart
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('cart.menuItem');
    res.json({ success: true, cart: user.cart });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Add to cart
router.post('/add', protect, async (req, res) => {
  try {
    const { menuItemId, restaurantId, quantity = 1 } = req.body;

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });

    const menuItem = restaurant.menu.id(menuItemId);
    if (!menuItem) return res.status(404).json({ success: false, message: 'Item not found' });

    const user = await User.findById(req.user._id);

    // Clear cart if from different restaurant
    if (user.cart.length > 0 && user.cart[0].restaurant.toString() !== restaurantId) {
      user.cart = [];
    }

    const existing = user.cart.find(i => i.menuItem.toString() === menuItemId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      user.cart.push({ menuItem: menuItemId, quantity, restaurant: restaurantId });
    }

    await user.save();
    res.json({ success: true, message: 'Added to cart', cart: user.cart });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Update quantity
router.put('/update', protect, async (req, res) => {
  try {
    const { menuItemId, quantity } = req.body;
    const user = await User.findById(req.user._id);

    if (quantity <= 0) {
      user.cart = user.cart.filter(i => i.menuItem.toString() !== menuItemId);
    } else {
      const item = user.cart.find(i => i.menuItem.toString() === menuItemId);
      if (item) item.quantity = quantity;
    }

    await user.save();
    res.json({ success: true, cart: user.cart });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Clear cart
router.delete('/clear', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { cart: [] });
    res.json({ success: true, message: 'Cart cleared' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
