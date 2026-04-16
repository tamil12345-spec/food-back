const express = require("express");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,         // rzp_test_xxxxxxxxxx
  key_secret: process.env.RAZORPAY_KEY_SECRET,  // Your secret key
});

// ─────────────────────────────────────────────
// POST /create-order
// Called by frontend before opening checkout
// ─────────────────────────────────────────────
app.post("/create-order", async (req, res) => {
  try {
    const { amount, currency = "INR", receipt } = req.body;

    // Amount must be in paise (multiply ₹ by 100)
    const options = {
      amount: amount * 100,
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: 1, // Auto-capture payment
    };

    const order = await razorpay.orders.create(options);
    res.json({ success: true, order });
  } catch (err) {
    console.error("Order creation failed:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /verify-payment
// Verify Razorpay signature after payment
// CRITICAL: Never skip this step
// ─────────────────────────────────────────────
app.post("/verify-payment", (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
    req.body;

  // Construct the expected signature
  const body = razorpay_order_id + "|" + razorpay_payment_id;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    // ✅ Signature is valid — payment is genuine
    // TODO: Update your database order status here
    // e.g., await Order.update({ status: "paid" }, { where: { id: razorpay_order_id } });

    res.json({
      success: true,
      message: "Payment verified",
      paymentId: razorpay_payment_id,
    });
  } else {
    // ❌ Signature mismatch — possible tampering
    console.error("Signature mismatch! Possible fraud attempt.");
    res.status(400).json({ success: false, message: "Payment verification failed" });
  }
});

// ─────────────────────────────────────────────
// POST /webhook
// Razorpay sends events here (optional but recommended)
// Set this URL in your Razorpay dashboard → Webhooks
// ─────────────────────────────────────────────
app.post("/webhook", express.raw({ type: "application/json" }), (req, res) => {
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
      // TODO: Mark order as paid in DB
      break;
    case "payment.failed":
      console.log("Payment failed:", event.payload.payment.entity);
      // TODO: Mark order as failed in DB
      break;
    default:
      console.log("Unhandled event:", event.event);
  }

  res.json({ received: true });
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));
