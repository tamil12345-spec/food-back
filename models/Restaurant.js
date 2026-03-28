const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  price: { type: Number, required: true },
  image: { type: String, default: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400' },
  category: { type: String, required: true },
  isAvailable: { type: Boolean, default: true },
  restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant' },
}, { timestamps: true });

const restaurantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  image: { type: String, default: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600' },
  cuisine: [{ type: String }],
  address: { type: String },
  rating: { type: Number, default: 4.0, min: 0, max: 5 },
  deliveryTime: { type: String, default: '30-45 min' },
  deliveryFee: { type: Number, default: 2.99 },
  minOrder: { type: Number, default: 10 },
  isOpen: { type: Boolean, default: true },
  menu: [menuItemSchema],
}, { timestamps: true });

const MenuItem = mongoose.model('MenuItem', menuItemSchema);
const Restaurant = mongoose.model('Restaurant', restaurantSchema);

module.exports = { Restaurant, MenuItem };
