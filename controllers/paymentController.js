const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const logger = require('../middleware/logger'); // Assuming you have a logger

const createPaymentIntent = async (req, res) => {
    try {
        const { amount, currency = 'usd', description = 'Feasibility Project Payment' } = req.body;

        // Validate amount
        if (!amount || amount < 50) { // Minimum amount in cents
            logger.warn(`Invalid payment amount: ${amount}`);
            return res.status(400).json({ error: 'Invalid amount. Minimum 50 cents required.' });
        }

        // Create a PaymentIntent with more detailed configuration
        const paymentIntent = await stripe.paymentIntents.create({
            amount,
            currency,
            payment_method_types: ['card'],
            metadata: {
                userId: req.user.id,
                description,
                timestamp: new Date().toISOString()
            },
            // Optional: Add more Stripe configurations
            setup_future_usage: 'off_session', // Allow saving card for future use
        });

        logger.info(`Payment Intent created: ${paymentIntent.id}`);
        res.status(200).json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id
        });
    } catch (error) {
        logger.error('Payment Intent Creation Error', { 
            error: error.message, 
            stack: error.stack 
        });
        res.status(500).json({ 
            error: 'Unable to create payment intent', 
            details: error.message 
        });
    }
};

const confirmPayment = async (req, res) => {
    try {
        const { paymentIntentId } = req.body;

        // Retrieve the PaymentIntent
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

        // Check payment status
        if (paymentIntent.status === 'succeeded') {
            // Save payment details to your database
            // You might want to create a payment record here
            logger.info(`Payment Successful: ${paymentIntentId}`);
            
            res.status(200).json({
                success: true,
                message: 'Payment successful',
                paymentDetails: {
                    id: paymentIntent.id,
                    amount: paymentIntent.amount,
                    currency: paymentIntent.currency,
                    method: paymentIntent.payment_method_types[0],
                    timestamp: new Date().toISOString()
                }
            });
        } else {
            logger.warn(`Payment not completed: ${paymentIntentId}, Status: ${paymentIntent.status}`);
            res.status(400).json({
                success: false,
                message: 'Payment not completed',
                status: paymentIntent.status
            });
        }
    } catch (error) {
        logger.error('Payment Confirmation Error', { 
            error: error.message, 
            stack: error.stack 
        });
        res.status(500).json({ 
            error: 'Unable to confirm payment', 
            details: error.message 
        });
    }
};

// New method to handle refunds
const refundPayment = async (req, res) => {
    try {
        const { paymentIntentId, amount } = req.body;

        // Create a refund
        const refund = await stripe.refunds.create({
            payment_intent: paymentIntentId,
            amount: amount || null // If no amount specified, refund full amount
        });

        logger.info(`Refund processed: ${refund.id}`);
        res.status(200).json({
            success: true,
            refundId: refund.id,
            amount: refund.amount
        });
    } catch (error) {
        logger.error('Refund Error', { 
            error: error.message, 
            stack: error.stack 
        });
        res.status(500).json({ 
            error: 'Unable to process refund', 
            details: error.message 
        });
    }
};

// Method to retrieve payment history
const getPaymentHistory = async (req, res) => {
    try {
        const paymentIntents = await stripe.paymentIntents.list({
            limit: 100,
            customer: req.user.stripeCustomerId // Assuming you store Stripe customer ID
        });

        res.status(200).json({
            success: true,
            paymentHistory: paymentIntents.data.map(intent => ({
                id: intent.id,
                amount: intent.amount,
                currency: intent.currency,
                status: intent.status,
                created: intent.created
            }))
        });
    } catch (error) {
        logger.error('Payment History Retrieval Error', { 
            error: error.message, 
            stack: error.stack 
        });
        res.status(500).json({ 
            error: 'Unable to retrieve payment history', 
            details: error.message 
        });
    }
};

module.exports = {
    createPaymentIntent,
    confirmPayment,
    refundPayment,
    getPaymentHistory
};
