const express  = require("express");
const cors     = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use("/api/auth",        require("./routes/authRoutes"));
app.use("/api/cart",        require("./routes/cartRoutes"));
app.use("/api/restaurants", require("./routes/restaurantRoutes"));
app.use("/api/orders",      require("./routes/orderRoutes"));
app.use("/api/payments",    require("./routes/paymentRoutes"));
app.use("/api/admin",       require("./routes/adminRoutes"));

// Connect to MongoDB, then auto-seed admin if missing
mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("MongoDB connected");

    const User  = require("./models/User");
    const bcrypt = require("bcryptjs");

    const adminExists = await User.findOne({ role: "admin" });
    if (!adminExists) {
      const hashed = await bcrypt.hash("Admin@9876!", 12);
      await User.create({
        name:     "Super Admin",
        email:    "admin@foodapp.com",
        password: hashed,
        role:     "admin",
      });
      console.log("✅ Admin user created: admin@foodapp.com / Admin@9876!");
    }
  })
  .catch(err => console.error("MongoDB connection error:", err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));