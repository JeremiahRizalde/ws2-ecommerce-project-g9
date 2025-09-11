// Contact form routes
const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware/auth');

// GET route for contact page
router.get('/', (req, res) => {
    res.render('contact', { 
        user: req.session.user || null,
        message: req.flash('message'),
        error: req.flash('error')
    });
});

// POST route for contact form submission
router.post('/submit', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;
        
        // Validate inputs
        if (!name || !email || !subject || !message) {
            req.flash('error', 'All fields are required');
            return res.redirect('/contact');
        }
        
        // For demo purposes, redirect to success page
        res.render('contact-success', {
            user: req.session.user || null,
            message: "Thank you for your message! We'll get back to you soon.",
            error: null
        });
        
    } catch (error) {
        console.error('Contact form error:', error);
        req.flash('error', 'There was a problem submitting your message. Please try again.');
        res.redirect('/contact');
    }
});

module.exports = router;