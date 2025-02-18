const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const serverless = require('serverless-http'); // Import serverless wrapper
const authRoutes = require('../routes/authRoutes'); // Adjust path
const paymentRoutes = require('../routes/paymentRoutes'); // Adjust path

// Load environment variables
dotenv.config();

const app = express();

// CORS Configuration
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            process.env.FRONTEND_URL,
            'http://localhost:5173',
            'http://localhost:5000',
            'http://127.0.0.1:3000'
        ];
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
    optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// Test Route
app.get('/test', (req, res) => {
    res.json({ message: "API is working on Vercel!" });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
    console.error('Unhandled Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production'
            ? 'Something went wrong'
            : err.message
    });
});

// 404 Handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.path}`
    });
});

// ✅ Export the Express App as a Serverless Function
module.exports = serverless(app);
