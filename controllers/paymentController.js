const crypto   = require("crypto");
const razorpay = require("../config/razorpay");

// POST /api/payments/create-order
const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, currency = "INR", receipt } = req.body;

    if (!amount) {
      return res.status(400).json({ success: false, message: "Amount is required" });
    }

    const order = await razorpay.orders.create({
      amount:          Math.round(amount * 100),            // ✅ safe rounding
      currency,
      receipt:         receipt || `receipt_${Date.now()}`,
      payment_capture: 1,
    });

    res.json({ success: true, order });
  } catch (err) {
    console.error("Order creation failed:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/payments/verify-payment
const verifyPayment = (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ success: false, message: "Missing payment fields" });
    }

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
  } catch (err) {
    console.error("verifyPayment error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/payments/webhook
const handleWebhook = (req, res) => {
  try {
    const signature         = req.headers["x-razorpay-signature"];
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(req.body)                      // ✅ raw Buffer — correct
      .digest("hex");

    if (expectedSignature !== signature) {
      return res.status(400).json({ message: "Invalid webhook signature" });
    }

    const event = JSON.parse(req.body.toString());  // ✅ Buffer → string → JSON

    switch (event.event) {
      case "payment.captured":
        console.log("✅ Payment captured:", event.payload.payment.entity);
        // TODO: update order status to 'paid' in your DB
        break;
      case "payment.failed":
        console.log("❌ Payment failed:", event.payload.payment.entity);
        // TODO: update order status to 'failed' in your DB
        break;
      default:
        console.log("Unhandled event:", event.event);
    }

    res.json({ received: true });
  } catch (err) {
    console.error("handleWebhook error:", err);
    res.status(500).json({ message: "Webhook handling failed" });
  }
};

module.exports = { createRazorpayOrder, verifyPayment, handleWebhook };