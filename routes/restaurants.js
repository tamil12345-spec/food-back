const express = require('express');
const { Restaurant } = require('../models/Restaurant');
const router = express.Router();

// Get all restaurants
router.get('/', async (req, res) => {
  try {
    const { search, cuisine } = req.query;
    let query = { isOpen: true };
    if (search) query.name = { $regex: search, $options: 'i' };
    if (cuisine) query.cuisine = { $in: [cuisine] };

    const restaurants = await Restaurant.find(query).select('-menu');
    res.json({ success: true, restaurants });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get single restaurant with menu
router.get('/:id', async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) return res.status(404).json({ success: false, message: 'Restaurant not found' });
    res.json({ success: true, restaurant });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
