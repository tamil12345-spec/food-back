const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

// ─────────────────────────────────────────────
// Razorpay instance
// ─────────────────────────────────────────────
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// ─────────────────────────────────────────────
// Mock Data (replace with DB queries later)
// ─────────────────────────────────────────────
const restaurants = [
  { id: 1, name: "Taco Loco",       cuisine: "Mexican", rating: 4.5, image: "", deliveryTime: "30 min" },
  { id: 2, name: "Burger Barn",     cuisine: "Burgers", rating: 4.2, image: "", deliveryTime: "25 min" },
  { id: 3, name: "Sushi Station",   cuisine: "Sushi",   rating: 4.7, image: "", deliveryTime: "40 min" },
  { id: 4, name: "Pizza Palace",    cuisine: "Pizza",   rating: 4.3, image: "", deliveryTime: "35 min" },
  { id: 5, name: "Curry Kingdom",   cuisine: "Indian",  rating: 4.6, image: "", deliveryTime: "30 min" },
];

const menus = {
  1: [
    { id: 101, name: "Tacos",       price: 199, description: "3 classic beef tacos" },
    { id: 102, name: "Burrito",     price: 249, description: "Stuffed chicken burrito" },
    { id: 103, name: "Nachos",      price: 179, description: "Loaded cheese nachos" },
  ],
  2: [
    { id: 201, name: "Classic Burger", price: 199, description: "Beef patty with lettuce & cheese" },
    { id: 202, name: "Veggie Burger",  price: 179, description: "Plant-based patty" },
    { id: 203, name: "Fries",          price: 99,  description: "Crispy golden fries" },
  ],
  3: [
    { id: 301, name: "Salmon Roll",  price: 349, description: "8 pcs fresh salmon" },
    { id: 302, name: "Dragon Roll",  price: 399, description: "Avocado & shrimp" },
    { id: 303, name: "Miso Soup",    price: 99,  description: "Traditional miso" },
  ],
  4: [
    { id: 401, name: "Margherita",   price: 299, description: "Classic tomato & mozzarella" },
    { id: 402, name: "Pepperoni",    price: 349, description: "Extra pepperoni" },
    { id: 403, name: "BBQ Chicken",  price: 379, description: "Smoky BBQ base" },
  ],
  5: [
    { id: 501, name: "Butter Chicken", price: 299, description: "Creamy tomato curry" },
    { id: 502, name: "Dal Makhani",    price: 249, description: "Slow-cooked black lentils" },
    { id: 503, name: "Garlic Naan",    price: 49,  description: "Freshly baked naan" },
  ],
};

// ─────────────────────────────────────────────
// GET /api/restaurants
// ?cuisine=Mexican  (optional filter)
// ─────────────────────────────────────────────
app.get("/api/restaurants", (req, res) => {
  const { cuisine } = req.query;
  const result = cuisine
    ? restaurants.filter(r => r.cuisine.toLowerCase() === cuisine.toLowerCase())
    : restaurants;
  res.json({ success: true, restaurants: result });
});

// ─────────────────────────────────────────────
// GET /api/restaurants/:id
// Single restaurant details
// ─────────────────────────────────────────────
app.get("/api/restaurants/:id", (req, res) => {
  const restaurant = restaurants.find(r => r.id === parseInt(req.params.id));
  if (!restaurant) return res.status(404).json({ success: false, message: "Restaurant not found" });
  res.json({ success: true, restaurant });
});

// ─────────────────────────────────────────────
// GET /api/restaurants/:id/menu
// Menu items for a restaurant
// ─────────────────────────────────────────────
app.get("/api/restaurants/:id/menu", (req, res) => {
  const id = parseInt(req.params.id);
  const menu = menus[id];
  if (!menu) return res.status(404).json({ success: false, message: "Menu not found" });
  res.json({ success: true, menu });
});

// ─────────────────────────────────────────────
// POST /api/create-order  (Razorpay)
// ─────────────────────────────────────────────
app.post("/api/create-order", async (req, res) => {
  try {
    const { amount, currency = "INR", receipt } = req.body;
    const options = {
      amount: amount * 100, // paise
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: 1,
    };
    const order = await razorpay.orders.create(options);
    res.json({ success: true, order });
  } catch (err) {
    console.error("Order creation failed:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/verify-payment  (Razorpay)
// ─────────────────────────────────────────────
app.post("/api/verify-payment", (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    res.json({ success: true, message: "Payment verified", paymentId: razorpay_payment_id });
  } else {
    console.error("Signature mismatch! Possible fraud.");
    res.status(400).json({ success: false, message: "Payment verification failed" });
  }
});

// ─────────────────────────────────────────────
// POST /api/webhook  (Razorpay)
// ─────────────────────────────────────────────
app.post("/api/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers["x-razorpay-signature"];
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(req.body)
    .digest("hex");

  if (expectedSignature !== signature) {
    return res.status(400).json({ message: "Invalid webhook signature" });
  }

  const event = JSON.parse(req.body);
  switch (event.event) {
    case "payment.captured":
      console.log("Payment captured:", event.payload.payment.entity);
      break;
    case "payment.failed":
      console.log("Payment failed:", event.payload.payment.entity);
      break;
    default:
      console.log("Unhandled event:", event.event);
  }
  res.json({ received: true });
});

// ─────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));