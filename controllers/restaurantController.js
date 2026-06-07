const { Restaurant } = require("../models/Restaurant");
const mongoose       = require("mongoose");

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// ── GET /api/restaurants ──────────────────────────────────────────────────────
const getRestaurants = async (req, res) => {
  try {
    const { cuisine, search } = req.query;
    const query = {};
    if (cuisine) query.cuisine = { $regex: cuisine, $options: 'i' };
    if (search)  query.name   = { $regex: search,  $options: 'i' };
    const restaurants = await Restaurant.find(query).select('-menu');
    return res.json({ success: true, restaurants });
  } catch (err) {
    console.error('[getRestaurants]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch restaurants.' });
  }
};

// ── GET /api/restaurants/:id ──────────────────────────────────────────────────
const getRestaurantById = async (req, res) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ success: false, message: 'Invalid restaurant ID.' });

    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant)
      return res.status(404).json({ success: false, message: 'Restaurant not found.' });

    return res.json({ success: true, restaurant });
  } catch (err) {
    console.error('[getRestaurantById]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch restaurant.' });
  }
};

// ── GET /api/restaurants/:id/menu ─────────────────────────────────────────────
const getMenu = async (req, res) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ success: false, message: 'Invalid restaurant ID.' });

    const restaurant = await Restaurant.findById(req.params.id).select('menu');
    if (!restaurant)
      return res.status(404).json({ success: false, message: 'Restaurant not found.' });

    return res.json({ success: true, menu: restaurant.menu });
  } catch (err) {
    console.error('[getMenu]', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch menu.' });
  }
};

// ── POST /api/admin/restaurants ───────────────────────────────────────────────
const createRestaurant = async (req, res) => {
  try {
    const { name, description, image, cuisine, address, deliveryTime, deliveryFee, minOrder } = req.body;

    if (!name?.trim())
      return res.status(400).json({ success: false, message: 'Restaurant name is required.' });

    const restaurant = await Restaurant.create({
      name: name.trim(),
      description, image, cuisine, address,
      deliveryTime, deliveryFee, minOrder,
      isOpen: true,
      menu: [],
    });

    return res.status(201).json({ success: true, restaurant });
  } catch (err) {
    console.error('[createRestaurant]', err);
    return res.status(500).json({ success: false, message: 'Failed to create restaurant.' });
  }
};

// ── PUT /api/admin/restaurants/:id ────────────────────────────────────────────
const updateRestaurant = async (req, res) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ success: false, message: 'Invalid restaurant ID.' });

    const allowed = ['name', 'description', 'image', 'cuisine', 'address',
                     'deliveryTime', 'deliveryFee', 'minOrder', 'isOpen', 'rating'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k]; });

    if (Object.keys(updates).length === 0)
      return res.status(400).json({ success: false, message: 'No valid fields provided.' });

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id, updates, { new: true, runValidators: true }
    );
    if (!restaurant)
      return res.status(404).json({ success: false, message: 'Restaurant not found.' });

    return res.json({ success: true, restaurant });
  } catch (err) {
    console.error('[updateRestaurant]', err);
    return res.status(500).json({ success: false, message: 'Failed to update restaurant.' });
  }
};

// ── DELETE /api/admin/restaurants/:id ─────────────────────────────────────────
const deleteRestaurant = async (req, res) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ success: false, message: 'Invalid restaurant ID.' });

    const restaurant = await Restaurant.findByIdAndDelete(req.params.id);
    if (!restaurant)
      return res.status(404).json({ success: false, message: 'Restaurant not found.' });

    return res.json({ success: true, message: 'Restaurant deleted.' });
  } catch (err) {
    console.error('[deleteRestaurant]', err);
    return res.status(500).json({ success: false, message: 'Failed to delete restaurant.' });
  }
};

// ── POST /api/admin/restaurants/:id/menu ──────────────────────────────────────
const addMenuItem = async (req, res) => {
  try {
    if (!isValidId(req.params.id))
      return res.status(400).json({ success: false, message: 'Invalid restaurant ID.' });

    const { name, description, price, category, image } = req.body;
    if (!name?.trim())
      return res.status(400).json({ success: false, message: 'Item name is required.' });
    if (price === undefined || isNaN(parseFloat(price)) || parseFloat(price) < 0)
      return res.status(400).json({ success: false, message: 'Valid price is required.' });

    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant)
      return res.status(404).json({ success: false, message: 'Restaurant not found.' });

    restaurant.menu.push({
      name: name.trim(), description, price: parseFloat(price), category, image,
    });
    await restaurant.save();

    const newItem = restaurant.menu[restaurant.menu.length - 1];
    return res.status(201).json({ success: true, menuItem: newItem, menu: restaurant.menu });
  } catch (err) {
    console.error('[addMenuItem]', err);
    return res.status(500).json({ success: false, message: 'Failed to add menu item.' });
  }
};

// ── PUT /api/admin/restaurants/:id/menu/:itemId ───────────────────────────────
const updateMenuItem = async (req, res) => {
  try {
    if (!isValidId(req.params.id) || !isValidId(req.params.itemId))
      return res.status(400).json({ success: false, message: 'Invalid ID.' });

    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant)
      return res.status(404).json({ success: false, message: 'Restaurant not found.' });

    const item = restaurant.menu.id(req.params.itemId);
    if (!item)
      return res.status(404).json({ success: false, message: 'Menu item not found.' });

    const { name, description, price, category, image, isAvailable } = req.body;
    if (name        !== undefined) item.name        = name.trim();
    if (description !== undefined) item.description = description;
    if (price       !== undefined) item.price       = parseFloat(price);
    if (category    !== undefined) item.category    = category;
    if (image       !== undefined) item.image       = image;
    if (isAvailable !== undefined) item.isAvailable = isAvailable;

    await restaurant.save();
    return res.json({ success: true, menuItem: item, menu: restaurant.menu });
  } catch (err) {
    console.error('[updateMenuItem]', err);
    return res.status(500).json({ success: false, message: 'Failed to update menu item.' });
  }
};

// ── DELETE /api/admin/restaurants/:id/menu/:itemId ────────────────────────────
const deleteMenuItem = async (req, res) => {
  try {
    if (!isValidId(req.params.id) || !isValidId(req.params.itemId))
      return res.status(400).json({ success: false, message: 'Invalid ID.' });

    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant)
      return res.status(404).json({ success: false, message: 'Restaurant not found.' });

    const item = restaurant.menu.id(req.params.itemId);
    if (!item)
      return res.status(404).json({ success: false, message: 'Menu item not found.' });

    item.deleteOne();
    await restaurant.save();

    return res.json({ success: true, message: 'Menu item deleted.', menu: restaurant.menu });
  } catch (err) {
    console.error('[deleteMenuItem]', err);
    return res.status(500).json({ success: false, message: 'Failed to delete menu item.' });
  }
};

module.exports = {
  getRestaurants, getRestaurantById, getMenu,
  createRestaurant, updateRestaurant, deleteRestaurant,
  addMenuItem, updateMenuItem, deleteMenuItem,
};