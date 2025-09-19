const express = require('express');
const router = express.Router();
router.get('/', (req, res) => {
    res.render('cart', {
        title: "Shopping Cart - Pixel Stop",
        user: req.session.user || null
    });
});

module.exports = router;