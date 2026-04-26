const express  = require("express");
const router   = express.Router();
const { createRazorpayOrder, verifyPayment, handleWebhook } = require("../controllers/paymentController");

router.post("/create-order",    createRazorpayOrder);
router.post("/verify-payment",  verifyPayment);
router.post("/webhook",         express.raw({ type: "application/json" }), handleWebhook);

module.exports = router;
