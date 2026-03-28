const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { protect } = require('../middleware/auth');
const Order = require('../models/Order');
const router = express.Router();

// Create payment intent
router.post('/', protect, async (req, res) => {
  try {
    const { restaurantId, items, totalAmount, deliveryFee, deliveryAddress, paymentIntentId } = req.body;

    // Verify payment with Stripe before creating order
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({ success: false, message: 'Payment not completed' });
    }

    const order = await Order.create({
      user: req.user._id,
      restaurant: restaurantId,
      items,
      totalAmount,
      deliveryFee,
      deliveryAddress,
      paymentStatus: 'paid',        // ✅ Only set after Stripe confirms
      paymentIntentId,
      status: 'confirmed',
      estimatedDelivery: new Date(Date.now() + 45 * 60 * 1000),
      statusHistory: [{ status: 'confirmed', note: 'Order placed successfully' }],
    });

    res.status(201).json({ success: true, order });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Stripe webhook
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object;
    await Order.findOneAndUpdate(
      { paymentIntentId: paymentIntent.id },
      { paymentStatus: 'paid', status: 'confirmed' }
    );
  }

  res.json({ received: true });
});

module.exports = router;
