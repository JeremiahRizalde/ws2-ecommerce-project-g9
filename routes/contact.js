const express = require('express'); 
const router = express.Router(); 
const { isAdmin } = require('../middleware/auth');

// Show contact form
router.get('/', (req, res) => {
    res.render('contact', { 
        title: "Contact Us - Pixel Stop",
        user: req.session.user || null,
        error: req.flash('error'),
        message: req.flash('message')
    });
});

// Handle contact form submission
router.post('/', async (req, res) => {
    try {
        // Validate form inputs
        if (!req.body.name || !req.body.email || !req.body.message) {
            req.flash('error', 'Please fill out all fields');
            return res.redirect('/contact');
        }

        // Store the contact message in MongoDB
        const db = req.app.locals.client.db(req.app.locals.dbName);
        const contactCollection = db.collection('contacts');
        
        await contactCollection.insertOne({
            name: req.body.name,
            email: req.body.email,
            subject: req.body.subject || 'General Inquiry',
            message: req.body.message,
            createdAt: new Date()
        });

        // Show success page
        res.render('contact-success', { 
            title: "Message Sent - Pixel Stop",
            user: req.session.user || null
        });
    } catch (error) {
        console.error("Error submitting contact form:", error);
        req.flash('error', 'An error occurred while sending your message. Please try again.');
        res.redirect('/contact');
    }
});

// GET route for viewing contact messages (admin only)
router.get('/messages', isAdmin, async (req, res) => {
    try {
        // Get all contact messages
        const db = req.app.locals.client.db(req.app.locals.dbName);
        const contactCollection = db.collection('contacts');
        
        const messages = await contactCollection.find().sort({ createdAt: -1 }).toArray();
        
        res.render('contact-messages', {
            title: 'Contact Messages - Pixel Stop',
            user: req.session.user,
            isAdmin: true,
            messages
        });
    } catch (error) {
        console.error('Error fetching contact messages:', error);
        req.flash('error', 'Failed to load contact messages');
        res.redirect('/dashboard');
    }
});

module.exports = router;