const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const serverless = require('serverless-http'); // Import serverless wrapper
const authRoutes = require('../routes/authRoutes');
const paymentRoutes = require('../routes/paymentRoutes');

// Load environment variables
dotenv.config();

const app = express();

// ✅ CORS Configuration (Allow all origins for testing)
const corsOptions = {
    origin: (origin, callback) => {
        const allowedOrigins = [
            process.env.FRONTEND_URL, // Production Frontend
            'http://localhost:5173',  // React Development Server
            'http://localhost:5000',  // Local Backend Server
            'http://127.0.0.1:3000'    // Next.js Development Server
        ];

        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.warn(`Blocked by CORS: ${origin}`);
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

// ✅ Logging Middleware (Shows all incoming requests)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ✅ Public Route - No Authentication Required
app.get('/api/test', (req, res) => {
    res.json({ message: "API is working on Vercel!" });
});

// ✅ Apply Authentication Middleware ONLY to Protected Routes
const authMiddleware = require('../middleware/auth');
app.use('/api/auth/protected', authMiddleware);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);

// ✅ Global Error Handler (Handles unexpected errors)
app.use((err, req, res, next) => {
    console.error('❌ Unhandled Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'production'
            ? 'Something went wrong'
            : err.message
    });
});

// ✅ 404 Handler (Handles requests to unknown routes)
app.use((req, res) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.path}`
    });
});

// ✅ Export as a Serverless Function for Vercel
module.exports = serverless(app);



// ✅ Auth & Payments Routes
app.use('/api/auth', require('../routes/authRoutes'));
app.use('/api/payments', require('../routes/paymentRoutes'));

// ✅ Error Handling Middleware
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    res.status(500).json({
        error: 'Internal Server Error',
        message: err.message || 'Something went wrong'
    });
});

// ✅ Export as a Serverless Function
module.exports = serverless(app);
