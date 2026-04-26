const crypto   = require("crypto");
const razorpay = require("../config/razorpay");

// POST /api/create-order
const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, currency = "INR", receipt } = req.body;
    const order = await razorpay.orders.create({
      amount: amount * 100,
      currency,
      receipt: receipt || `receipt_${Date.now()}`,
      payment_capture: 1,
    });
    res.json({ success: true, order });
  } catch (err) {
    console.error("Order creation failed:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/verify-payment
const verifyPayment = (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    res.json({ success: true, message: "Payment verified", paymentId: razorpay_payment_id });
  } else {
    console.error("Signature mismatch! Possible fraud.");
    res.status(400).json({ success: false, message: "Payment verification failed" });
  }
};

// POST /api/webhook
const handleWebhook = (req, res) => {
  const signature = req.headers["x-razorpay-signature"];
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
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
};

module.exports = { createRazorpayOrder, verifyPayment, handleWebhook };
