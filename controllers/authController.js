const jwt  = require("jsonwebtoken");
const { users } = require("../config/db");

const signToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || "secret123",
    { expiresIn: "7d" }
  );

// POST /api/auth/register
const register = (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password)
    return res.status(400).json({ success: false, message: "All fields required" });

  if (users.find((u) => u.email === email))
    return res.status(400).json({ success: false, message: "Email already registered" });

  const user = { id: Date.now().toString(), name, email, password, role: "user" };
  users.push(user);

  const token = signToken(user);
  res.json({ success: true, token, user: { id: user.id, name, email, role: user.role } });
};

// POST /api/auth/login
const login = (req, res) => {
  const { email, password } = req.body;

  const user = users.find((u) => u.email === email && u.password === password);
  if (!user)
    return res.status(401).json({ success: false, message: "Invalid email or password" });

  const token = signToken(user);
  res.json({ success: true, token, user: { id: user.id, name: user.name, email, role: user.role } });
};

// GET /api/auth/me
const getMe = (req, res) => {
  const user = users.find((u) => u.id === req.user.id);
  if (!user)
    return res.status(404).json({ success: false, message: "User not found" });

  res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
};

module.exports = { register, login, getMe };
