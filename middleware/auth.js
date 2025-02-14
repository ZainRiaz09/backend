const jwt = require('jsonwebtoken');
require('dotenv').config();

const auth = (req, res, next) => {
    // Get token from header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    // Check if no token
    if (!token) {
        return res.status(401).json({ 
            error: 'No token, authorization denied',
            details: 'Please log in to access this resource'
        });
    }

    try {
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Add user from payload
        req.user = decoded;
        next();
    } catch (err) {
        // Different error handling for different token issues
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                error: 'Token expired',
                details: 'Your session has expired. Please log in again.'
            });
        }

        if (err.name === 'JsonWebTokenError') {
            return res.status(401).json({ 
                error: 'Invalid token',
                details: 'The authentication token is invalid.'
            });
        }

        // Catch-all for other token-related errors
        res.status(500).json({ 
            error: 'Server authentication error',
            details: err.message 
        });
    }
};

module.exports = auth;
