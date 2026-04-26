const express = require("express");
const cors    = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/cart", require("./routes/cartRoutes"));
// Routes
app.use("/api/auth",        require("./routes/authRoutes"));
app.use("/api/restaurants", require("./routes/restaurantRoutes"));
app.use("/api/orders",      require("./routes/orderRoutes"));
app.use("/api",             require("./routes/paymentRoutes")); // /api/create-order, /api/verify-payment, /api/webhook

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
