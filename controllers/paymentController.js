const crypto   = require("crypto");
const razorpay = require("../config/razorpay");
const Order    = require("../models/Order");

// ── POST /api/payments/create-order ──────────────────────────────────────────
const createRazorpayOrder = async (req, res) => {
  try {
    const { amount, currency = "INR", receipt, orderId } = req.body;

    if (!amount || isNaN(amount) || amount <= 0)
      return res.status(400).json({ success: false, message: "Valid amount is required." });

    const order = await razorpay.orders.create({
      amount:          Math.round(amount * 100), // paise
      currency,
      receipt:         receipt || `receipt_${Date.now()}`,
      payment_capture: 1,
      notes:           { orderId: orderId || '' },
    });

    return res.json({ success: true, order });
  } catch (err) {
    console.error("[createRazorpayOrder]", err);
    return res.status(500).json({ success: false, message: "Failed to create payment order." });
  }
};

// ── POST /api/payments/verify-payment ────────────────────────────────────────
const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      orderId,           // our DB order _id
      paymentMethod,     // e.g. 'card', 'upi', 'netbanking', 'wallet'
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
      return res.status(400).json({ success: false, message: "Missing payment verification fields." });

    // ── Verify signature ────────────────────────────────────────────────────
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      console.error("[verifyPayment] Signature mismatch — possible fraud");
      return res.status(400).json({ success: false, message: "Payment verification failed." });
    }

    // ── Fetch actual payment method from Razorpay ───────────────────────────
    // This is the fix for payments showing as "UPI" —
    // instead of trusting what the frontend sends, we fetch the real method
    // from Razorpay's API so it's always accurate.
    let actualMethod = paymentMethod || 'razorpay';
    try {
      const payment = await razorpay.payments.fetch(razorpay_payment_id);
      // Razorpay returns: 'card', 'netbanking', 'wallet', 'upi', 'emi'
      actualMethod = payment.method || actualMethod;
    } catch (fetchErr) {
      console.warn("[verifyPayment] Could not fetch payment details:", fetchErr.message);
    }

    // ── Update our DB order with payment details ────────────────────────────
    if (orderId) {
      await Order.findByIdAndUpdate(orderId, {
        paymentStatus:   'paid',
        paymentMethod:   actualMethod,
        paymentIntentId: razorpay_payment_id,
        statusHistory:   [{
          $each: [{
            status:    'confirmed',
            note:      `Payment received via ${actualMethod}`,
            changedAt: new Date(),
          }],
          $position: -1,
        }],
      });
    }

    return res.json({
      success:     true,
      message:     "Payment verified successfully.",
      paymentId:   razorpay_payment_id,
      method:      actualMethod,
    });
  } catch (err) {
    console.error("[verifyPayment]", err);
    return res.status(500).json({ success: false, message: "Payment verification failed." });
  }
};

// ── POST /api/payments/webhook ────────────────────────────────────────────────
const handleWebhook = async (req, res) => {
  try {
    const signature         = req.headers["x-razorpay-signature"];
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(req.body)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.error("[webhook] Invalid signature");
      return res.status(400).json({ message: "Invalid webhook signature." });
    }

    const event   = JSON.parse(req.body.toString());
    const payment = event.payload?.payment?.entity;

    switch (event.event) {

      case "payment.captured": {
        console.log("✅ Payment captured:", payment?.id);
        // Update order by razorpay order_id stored in notes
        const dbOrderId = payment?.notes?.orderId;
        if (dbOrderId) {
          await Order.findByIdAndUpdate(dbOrderId, {
            paymentStatus:   'paid',
            paymentMethod:   payment?.method || 'razorpay',
            paymentIntentId: payment?.id,
          });
        }
        break;
      }

      case "payment.failed": {
        console.log("❌ Payment failed:", payment?.id);
        const dbOrderId = payment?.notes?.orderId;
        if (dbOrderId) {
          await Order.findByIdAndUpdate(dbOrderId, {
            paymentStatus: 'failed',
          });
        }
        break;
      }

      case "refund.created": {
        const refund    = event.payload?.refund?.entity;
        const dbOrderId = refund?.notes?.orderId;
        console.log("↩️ Refund created:", refund?.id);
        if (dbOrderId) {
          await Order.findByIdAndUpdate(dbOrderId, {
            paymentStatus: 'refunded',
          });
        }
        break;
      }

      default:
        console.log("[webhook] Unhandled event:", event.event);
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("[handleWebhook]", err);
    return res.status(500).json({ message: "Webhook handling failed." });
  }
};

module.exports = { createRazorpayOrder, verifyPayment, handleWebhook };