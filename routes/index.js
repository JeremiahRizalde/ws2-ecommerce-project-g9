// routes/index.js

const express = require('express');
const router = express.Router();

//Home Route
<<<<<<< HEAD
router.get('/', (req,res) => {
    res.render('index', {
        title: "Home - Pixel Gamer Shop",
        user: req.session.user || null,
        error: req.flash('error'),
        message: req.flash('message')
    });
=======
router.get('/', (req,res) =>{
    res.render('index', {title: "Home Page", message: "Hello, MongoDB is connected!!!" });
>>>>>>> 2be40e61ca7033bb242098e61f8f3d15fb51deca
});

module.exports = router;

