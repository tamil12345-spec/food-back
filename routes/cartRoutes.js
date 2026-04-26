const express        = require("express");
const router         = express.Router();
const authMiddleware = require("../middleware/authMiddleware");

// Simple in-memory cart per user
const carts = {};

router.get("/", authMiddleware, (req, res) => {
  const cart = carts[req.user.id] || [];
  res.json({ success: true, cart });
});

router.post("/add", authMiddleware, (req, res) => {
  const { item } = req.body;
  if (!carts[req.user.id]) carts[req.user.id] = [];
  carts[req.user.id].push(item);
  res.json({ success: true, cart: carts[req.user.id] });
});

router.delete("/remove/:itemId", authMiddleware, (req, res) => {
  if (!carts[req.user.id]) return res.json({ success: true, cart: [] });
  carts[req.user.id] = carts[req.user.id].filter(i => i._id !== req.params.itemId);
  res.json({ success: true, cart: carts[req.user.id] });
});

router.delete("/clear", authMiddleware, (req, res) => {
  carts[req.user.id] = [];
  res.json({ success: true, cart: [] });
});

module.exports = router;