const { restaurants, menus } = require("../config/mockData");

// GET /api/restaurants?cuisine=Mexican
const getRestaurants = (req, res) => {
  const { cuisine } = req.query;
  const result = cuisine
    ? restaurants.filter((r) =>
        r.cuisine.some((c) => c.toLowerCase() === cuisine.toLowerCase())
      )
    : restaurants;
  res.json({ success: true, restaurants: result });
};

// GET /api/restaurants/:id
const getRestaurantById = (req, res) => {
  const restaurant = restaurants.find((r) => r._id === req.params.id);
  if (!restaurant)
    return res.status(404).json({ success: false, message: "Restaurant not found" });
  res.json({ success: true, restaurant });
};

// GET /api/restaurants/:id/menu
const getMenu = (req, res) => {
  const menu = menus[req.params.id];
  if (!menu)
    return res.status(404).json({ success: false, message: "Menu not found" });
  res.json({ success: true, menu });
};

module.exports = { getRestaurants, getRestaurantById, getMenu };
