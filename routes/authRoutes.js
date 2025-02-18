const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const auth = require('../middleware/auth'); // Import authentication middleware

// ✅ Wrap route handlers to catch async errors
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

// ✅ Public Routes (No Authentication Required)
router.post('/signup', asyncHandler(authController.signup));
router.post('/signin', asyncHandler(authController.signin));
router.post('/forgot-password', asyncHandler(authController.forgotPassword));

// ✅ Protected Routes (Require Authentication)
router.post('/change-password', auth, asyncHandler(authController.changePassword));

module.exports = router;
