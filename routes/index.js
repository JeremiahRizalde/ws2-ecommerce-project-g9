// routes/index.js

const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

//Home Route
router.get('/', async (req, res) => {
    try {
        await client.connect();
        const database = client.db('ecommerceDB');
        const productsCollection = database.collection('products');
        
        // Fetch 4 random products for featured section
        const featuredProducts = await productsCollection.aggregate([
            { $sample: { size: 4 } }
        ]).toArray();
        
        res.render('index', {
            title: "Home - Pixel Stop",
            user: req.session.user || null,
            error: req.flash('error'),
            message: req.flash('message'),
            featuredProducts: featuredProducts
        });
    } catch (error) {
        console.error('Error fetching featured products:', error);
        res.render('index', {
            title: "Home - Pixel Stop",
            user: req.session.user || null,
            error: req.flash('error'),
            message: req.flash('message'),
            featuredProducts: []
        });
    } finally {
        await client.close();
    }
});

// About Route
router.get('/about', (req, res) => {
    res.render('about', {
        title: "About Us - Pixel Stop",
        name: "Jeremiah Rizalde",
        description:"Your ultimate destination for merchandise from your favorite pixel games!",
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
