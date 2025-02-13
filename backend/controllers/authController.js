const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password validation function
const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d]{8,}$/;
    return passwordRegex.test(password);
};

// Generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        { 
            id: user.id, 
            email: user.email, 
            fullName: user.full_name
        }, 
        process.env.JWT_SECRET, 
        { expiresIn: '30d' }
    );
};

// ✅ User Signup
const signup = async (req, res) => {
    try {
        const { fullName, email, password } = req.body;

        // Validate input fields
        if (!fullName || !email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email address' });
        }

        if (!validatePassword(password)) {
            return res.status(400).json({ 
                error: 'Password must be at least 8 characters long, contain one uppercase letter, one lowercase letter, and one number' 
            });
        }

        // Check if user already exists
        const existingUser = await db.oneOrNone('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser) {
            return res.status(409).json({ error: 'User with this email already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Generate UUID
        const userId = uuidv4();

        // Get default role ID
        const defaultRole = await db.oneOrNone('SELECT id FROM roles WHERE name = $1', ['user']);
        if (!defaultRole) {
            return res.status(500).json({ error: 'Default role not found' });
        }

        // Insert user into the database
        const newUser = await db.one(
            `INSERT INTO users (id, full_name, email, password, is_active)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, full_name, email, is_active`,
            [userId, fullName, email, hashedPassword, true]
        );

        // Assign default role
        await db.none('INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)', [newUser.id, defaultRole.id]);

        // Generate JWT token
        const token = generateToken(newUser);

        res.status(201).json({
            message: 'User registered successfully',
            user: {
                id: newUser.id,
                fullName: newUser.full_name,
                email: newUser.email,
                isActive: newUser.is_active
            },
            token
        });

    } catch (error) {
        console.error('Signup Error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
};

// ✅ User Signin
const signin = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: 'Invalid email format' });
        }

        // Find user by email
        const user = await db.oneOrNone('SELECT id, email, full_name, password FROM users WHERE email = $1', [email]);

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Generate token
        const token = generateToken(user);

        res.status(200).json({
            message: 'Signin successful',
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name
            },
            token
        });

    } catch (error) {
        console.error('Signin Error:', error);
        res.status(500).json({ error: 'Server error during signin' });
    }
};

// ✅ Forgot Password
const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await db.oneOrNone('SELECT id FROM users WHERE email = $1', [email]);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Generate reset token
        const resetToken = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // Store reset token in the database
        await db.none('INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, NOW() + INTERVAL \'1 hour\')', [user.id, resetToken]);

        res.json({ message: 'Password reset instructions sent to email' });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// ✅ Reset Password
const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        const resetToken = await db.oneOrNone('SELECT * FROM password_reset_tokens WHERE token = $1 AND is_used = false AND expires_at > NOW()', [token]);

        if (!resetToken) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await db.tx(async t => {
            await t.none('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, resetToken.user_id]);
            await t.none('UPDATE password_reset_tokens SET is_used = true WHERE id = $1', [resetToken.id]);
        });

        res.json({ message: 'Password reset successful' });

    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// ✅ Change Password
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user.id; // From auth middleware

        const user = await db.one('SELECT password FROM users WHERE id = $1', [userId]);

        const isValidPassword = await bcrypt.compare(currentPassword, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Current password is incorrect' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await db.none('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, userId]);

        res.json({ message: 'Password updated successfully' });

    } catch (error) {
        console.error('Error in changePassword:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    signup,
    signin,
    forgotPassword,
    resetPassword,
    changePassword
};
