// Product routes
const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware/auth');

// GET route for main products page
router.get('/', (req, res) => {
    // In a real app, you would fetch products from the database
    // For now, we'll just render the static template
    res.render('products', { 
        user: req.session.user || null,
        message: req.flash('message'),
        error: req.flash('error'),
        gameFilter: null // Adding gameFilter with null value for the main products page
    });
});

// GET route for filtered products by game
router.get('/:game', (req, res) => {
    const game = req.params.game;
    // In a real app, you would filter products by game from the database
    // For now, we'll just render the same template but you could customize based on the game
    res.render('products', { 
        user: req.session.user || null,
        message: req.flash('message'),
        error: req.flash('error'),
        gameFilter: game
    });
});

module.exports = router;