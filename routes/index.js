// routes/index.js

const express = require('express');
const router = express.Router();

//Home Route
router.get('/', (req,res) => {
    res.render('index', {
        title: "Home - Pixel Stop",
        user: req.session.user || null,
        error: req.flash('error'),
        message: req.flash('message')
    });
});

// About Route
router.get('/about', (req, res) => {
    res.render('about', {
        title: "About Us - Pixel Stop",
        user: req.session.user || null,
        error: req.flash('error'),
        message: req.flash('message')
    });
});

// Terms & Conditions Route
router.get('/terms', (req, res) => {
    res.render('terms', { 
        title: 'Terms & Conditions',
        message: req.flash('message'),
        error: req.flash('error'),
        user: req.session.user || null
    });
});

// Privacy Policy Route
router.get('/privacypolicy', (req, res) => {
    res.render('privacypolicy', {
        title: 'Privacy Policy',
        message: req.flash('message'),
        error: req.flash('error'),
        user: req.session.user || null
    });
});

module.exports = router;

