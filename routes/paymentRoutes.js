const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/auth');

// Create payment intent (requires authentication)
router.post('/create-payment-intent', auth, paymentController.createPaymentIntent);

// Confirm payment (requires authentication)
router.post('/confirm-payment', auth, paymentController.confirmPayment);

// Process refund (requires authentication)
router.post('/refund', auth, paymentController.refundPayment);

// Get payment history (requires authentication)
router.get('/history', auth, paymentController.getPaymentHistory);

module.exports = router;
