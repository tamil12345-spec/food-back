const { Restaurant } = require("../models/Restaurant");

// GET /api/restaurants
const getRestaurants = async (req, res) => {
  try {
    const { cuisine, search } = req.query;
    const query = {};
    if (cuisine) query.cuisine = { $regex: cuisine, $options: 'i' };
    if (search)  query.name   = { $regex: search,  $options: 'i' };
    const restaurants = await Restaurant.find(query).select('-menu');
    res.json({ success: true, restaurants });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/restaurants/:id
const getRestaurantById = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant)
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    res.json({ success: true, restaurant });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/restaurants/:id/menu
const getMenu = async (req, res) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id).select('menu');
    if (!restaurant)
      return res.status(404).json({ success: false, message: "Restaurant not found" });
    res.json({ success: true, menu: restaurant.menu });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getRestaurants, getRestaurantById, getMenu };