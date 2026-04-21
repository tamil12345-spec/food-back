const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const cors = require("cors");
const jwt = require("jsonwebtoken");
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
// In-memory stores (replace with DB later)
// ─────────────────────────────────────────────
const users  = [];
const orders = [];

// ─────────────────────────────────────────────
// Auth helper
// ─────────────────────────────────────────────
function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false, message: "Unauthorized" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || "secret123");
    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid token" });
  }
}

// ─────────────────────────────────────────────
// Mock Data  ← _id strings, full fields
// ─────────────────────────────────────────────
const restaurants = [
  { _id: "1", name: "Taco Loco",       cuisine: ["Mexican"], rating: 4.5, image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400", deliveryTime: "30 min", deliveryFee: 1.99, minOrder: 10, isOpen: true,  description: "Authentic Mexican street food" },
  { _id: "2", name: "Burger Barn",     cuisine: ["Burgers"], rating: 4.2, image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400", deliveryTime: "25 min", deliveryFee: 0.99, minOrder: 8,  isOpen: true,  description: "Juicy handcrafted burgers" },
  { _id: "3", name: "Sushi Station",   cuisine: ["Sushi"],   rating: 4.7, image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=400", deliveryTime: "40 min", deliveryFee: 2.49, minOrder: 15, isOpen: true,  description: "Fresh Japanese cuisine" },
  { _id: "4", name: "Pizza Palace",    cuisine: ["Pizza"],   rating: 4.3, image: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400", deliveryTime: "35 min", deliveryFee: 1.49, minOrder: 12, isOpen: true,  description: "Wood-fired artisan pizzas" },
  { _id: "5", name: "Curry Kingdom",   cuisine: ["Indian"],  rating: 4.6, image: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400", deliveryTime: "30 min", deliveryFee: 1.99, minOrder: 10, isOpen: false, description: "Rich and aromatic curries" },
];

const menus = {
  "1": [
    { _id: "101", name: "Tacos",    price: 199, description: "3 classic beef tacos",       category: "Mains"  },
    { _id: "102", name: "Burrito",  price: 249, description: "Stuffed chicken burrito",    category: "Mains"  },
    { _id: "103", name: "Nachos",   price: 179, description: "Loaded cheese nachos",       category: "Snacks" },
  ],
  "2": [
    { _id: "201", name: "Classic Burger", price: 199, description: "Beef patty with lettuce & cheese", category: "Burgers" },
    { _id: "202", name: "Veggie Burger",  price: 179, description: "Plant-based patty",                category: "Burgers" },
    { _id: "203", name: "Fries",          price: 99,  description: "Crispy golden fries",              category: "Sides"   },
  ],
  "3": [
    { _id: "301", name: "Salmon Roll",  price: 349, description: "8 pcs fresh salmon",  category: "Rolls" },
    { _id: "302", name: "Dragon Roll",  price: 399, description: "Avocado & shrimp",    category: "Rolls" },
    { _id: "303", name: "Miso Soup",    price: 99,  description: "Traditional miso",    category: "Sides" },
  ],
  "4": [
    { _id: "401", name: "Margherita",  price: 299, description: "Classic tomato & mozzarella", category: "Pizza" },
    { _id: "402", name: "Pepperoni",   price: 349, description: "Extra pepperoni",              category: "Pizza" },
    { _id: "403", name: "BBQ Chicken", price: 379, description: "Smoky BBQ base",               category: "Pizza" },
  ],
  "5": [
    { _id: "501", name: "Butter Chicken", price: 299, description: "Creamy tomato curry",       category: "Mains" },
    { _id: "502", name: "Dal Makhani",    price: 249, description: "Slow-cooked black lentils", category: "Mains" },
    { _id: "503", name: "Garlic Naan",    price: 49,  description: "Freshly baked naan",        category: "Breads" },
  ],
};

// ─────────────────────────────────────────────
// AUTH ROUTES
// ─────────────────────────────────────────────

// POST /api/auth/register
app.post("/api/auth/register", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ success: false, message: "All fields required" });

  if (users.find(u => u.email === email))
    return res.status(400).json({ success: false, message: "Email already registered" });

  const user = { id: Date.now().toString(), name, email, password, role: "user" };
  users.push(user);

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || "secret123",
    { expiresIn: "7d" }
  );

  res.json({ success: true, token, user: { id: user.id, name, email, role: user.role } });
});

// POST /api/auth/login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email && u.password === password);
  if (!user)
    return res.status(401).json({ success: false, message: "Invalid email or password" });

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || "secret123",
    { expiresIn: "7d" }
  );

  res.json({ success: true, token, user: { id: user.id, name: user.name, email, role: user.role } });
});

// GET /api/auth/me
app.get("/api/auth/me", authMiddleware, (req, res) => {
  const user = users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ success: false, message: "User not found" });
  res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

// ─────────────────────────────────────────────
// RESTAURANT ROUTES
// ─────────────────────────────────────────────

// GET /api/restaurants?cuisine=Mexican
app.get("/api/restaurants", (req, res) => {
  const { cuisine } = req.query;
  const result = cuisine
    ? restaurants.filter(r => r.cuisine.some(c => c.toLowerCase() === cuisine.toLowerCase()))
    : restaurants;
  res.json({ success: true, restaurants: result });
});

// GET /api/restaurants/:id
app.get("/api/restaurants/:id", (req, res) => {
  const restaurant = restaurants.find(r => r._id === req.params.id);
  if (!restaurant) return res.status(404).json({ success: false, message: "Restaurant not found" });
  res.json({ success: true, restaurant });
});

// GET /api/restaurants/:id/menu
app.get("/api/restaurants/:id/menu", (req, res) => {
  const menu = menus[req.params.id];
  if (!menu) return res.status(404).json({ success: false, message: "Menu not found" });
  res.json({ success: true, menu });
});

// ─────────────────────────────────────────────
// ORDER ROUTES
// ─────────────────────────────────────────────

// POST /api/orders
app.post("/api/orders", authMiddleware, (req, res) => {
  const { restaurantId, items, total, address } = req.body;

  if (!restaurantId || !items || !items.length)
    return res.status(400).json({ success: false, message: "restaurantId and items are required" });

  const order = {
    _id: Date.now().toString(),
    userId: req.user.id,
    restaurantId,
    items,
    total,
    address,
    status: "pending",
    createdAt: new Date(),
  };
  orders.push(order);
  res.status(201).json({ success: true, order });
});

// GET /api/orders/my-orders
app.get("/api/orders/my-orders", authMiddleware, (req, res) => {
  const myOrders = orders.filter(o => o.userId === req.user.id);
  res.json({ success: true, orders: myOrders });
});

// GET /api/orders/:id
app.get("/api/orders/:id", authMiddleware, (req, res) => {
  const order = orders.find(o => o._id === req.params.id && o.userId === req.user.id);
  if (!order) return res.status(404).json({ success: false, message: "Order not found" });
  res.json({ success: true, order });
});

// ─────────────────────────────────────────────
// RAZORPAY ROUTES
// ─────────────────────────────────────────────

// POST /api/create-order
app.post("/api/create-order", async (req, res) => {
  try {
    const { amount, currency = "INR", receipt } = req.body;
    const options = {
      amount: amount * 100,
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

// POST /api/verify-payment
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

// POST /api/webhook
app.post("/api/webhook", express.raw({ type: "application/json" }), (req, res) => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers["x-razorpay-signature"];
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(req.body)
    .digest("hex");

  if (expectedSignature !== signature)
    return res.status(400).json({ message: "Invalid webhook signature" });

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
