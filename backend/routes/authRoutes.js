const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');

// Wrap route handlers to catch async errors
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

router.post('/signup', asyncHandler(authController.signup));
router.post('/signin', asyncHandler(authController.signin));
router.post('/change-password', auth, asyncHandler(authController.changePassword));
router.post('/forgot-password', asyncHandler(authController.forgotPassword));

// Add a validation middleware for all routes
router.use((err, req, res, next) => {
    console.error('Auth Route Error:', err);
    
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            error: 'Validation Failed',
            details: err.details
        });
    }

    res.status(err.status || 500).json({
        error: err.message || 'An unexpected error occurred',
        ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    });
});

module.exports = router;
