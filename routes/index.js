// routes/index.js

const express = require('express');
const router = express.Router();

//Home Route
router.get('/', (req,res) => {
    res.render('index', {
        title: "Home - Pixel Gamer Shop",
        user: req.session.user || null,
        error: req.flash('error'),
        message: req.flash('message')
    });
});

module.exports = router;

