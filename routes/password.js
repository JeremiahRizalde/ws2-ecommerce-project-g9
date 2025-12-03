const verifyTurnstile = require('../utils/turnstileVerify');

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

const { Resend } = require('resend');
let resend;
try {
    // Only initialize Resend if API key is available
    if (process.env.RESEND_API_KEY) {
        resend = new Resend(process.env.RESEND_API_KEY);
        console.log("Resend initialized with API key in password.js");
    } else {
        console.warn('RESEND_API_KEY is not set. Password reset functionality will be disabled.');
    }
} catch (error) {
    console.error('Failed to initialize Resend in password.js:', error);
}

const bcrypt = require('bcrypt');
const saltRounds = 12;

// Show forgot password form
router.get('/forgot', (req, res) => {
    res.render('forgot-password', { title: "Forgot Password" });
});


// Handle forgot password form submission
router.post('/forgot', async (req, res) => {
    try {
        const db = req.app.locals.client.db(req.app.locals.dbName);
        const usersCollection = db.collection('users');
        // Find user by email
        const user = await usersCollection.findOne({ email: req.body.email });

        if (!user) {
            return res.send("No account found with this email.");
        }

        // Generate reset token and expiry (1 hour)
        const token = uuidv4();
        const expiry = new Date(Date.now() + 3600000);

        // Save token in database
        await usersCollection.updateOne(
            { email: user.email },
            { $set: { resetToken: token, resetExpiry: expiry } }
        );

        // Build reset URL
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const resetUrl = `${baseUrl}/password/reset/${token}`;

        // Send email with Resend
        await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL,
            to: user.email,
            subject: 'Password Reset Request',
            html: `
            <h2>Password Reset</h2>
            <p>Click below to reset your password:</p>
            <a href="${resetUrl}">${resetUrl}</a>
            `
        });
        res.render('password-reset-link-sent');
        } catch (err) {
    console.error("Error in password reset:", err);
    res.send("Something went wrong.");
    }
});

// Show reset password form
router.get('/reset/:token', (req, res) => {
    res.render('reset-password', { title: "Reset Password", token: req.params.token });
});

    // Handle reset password form
    router.post('/reset/:token', async (req, res) => {
        // Verify Turnstile first
        const turnstileToken = req.body['cf-turnstile-response'];
        const result = await verifyTurnstile(turnstileToken, req.ip);

        if (!result || !result.success) {
            return res.status(400).render('reset-password', { 
                title: "Reset Password", 
                token: req.params.token,
                error: 'Verification failed. Please try again.' 
            });
        }

        try {
            const db = req.app.locals.client.db(req.app.locals.dbName);
            const usersCollection = db.collection('users');

            // Find user by token and make sure it's not expired
            const user = await usersCollection.findOne({
                resetToken: req.params.token,
                resetExpiry: { $gt: new Date() }
            });
            if (!user) {
                return res.render('password-reset-error', {
                    errorType: 'INVALID OR EXPIRED LINK',
                    message: 'This password reset link is invalid or has expired. Please request a new password reset link.'
                });
            }

            // Check if passwords match
            if (req.body.password !== req.body.confirm) {
                return res.render('password-reset-error', {
                    errorType: 'PASSWORDS DO NOT MATCH',
                    message: 'The passwords you entered do not match. Please go back and try again.'
                });
            }

            // Validate password requirements
            const password = req.body.password;
            if (password.length < 8) {
                return res.render('password-reset-error', {
                    errorType: 'WEAK PASSWORD',
                    message: 'Password must be at least 8 characters long.'
                });
            }
            if (!/[A-Z]/.test(password)) {
                return res.render('password-reset-error', {
                    errorType: 'WEAK PASSWORD',
                    message: 'Password must contain at least one uppercase letter.'
                });
            }
            if (!/[a-z]/.test(password)) {
                return res.render('password-reset-error', {
                    errorType: 'WEAK PASSWORD',
                    message: 'Password must contain at least one lowercase letter.'
                });
            }
            if (!/[0-9]/.test(password)) {
                return res.render('password-reset-error', {
                    errorType: 'WEAK PASSWORD',
                    message: 'Password must contain at least one number.'
                });
            }
            if (!/[^A-Za-z0-9]/.test(password)) {
                return res.render('password-reset-error', {
                    errorType: 'WEAK PASSWORD',
                    message: 'Password must contain at least one special character.'
                });
            }

            // Hash the new password
            const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
            // Update password in DB, clear token and expiry
            await usersCollection.updateOne(
                { email: user.email },
                {
                    $set: { passwordHash: hashedPassword, updatedAt: new Date() },
                    $unset: { resetToken: "", resetExpiry: "" }
                }
            );
            res.render('password-reset-success');
        } catch (err) {
            console.error("Error resetting password:", err);
            res.render('password-reset-error', {
                errorType: 'RESET ERROR',
                message: 'Something went wrong while resetting your password. Please try again later.'
            });
        }
    });
module.exports = router;