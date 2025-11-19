// Product routes
const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware/auth');
const { MongoClient } = require('mongodb');

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

// GET route for main products page
router.get('/', async (req, res) => {
    try {
        await client.connect();
        const database = client.db('ecommerceDB');
        const productsCollection = database.collection('products');
        
        const products = await productsCollection.find({}).sort({ createdAt: -1 }).toArray();
        
        res.render('products', { 
            user: req.session.user || null,
            message: req.flash('message'),
            error: req.flash('error'),
            gameFilter: null,
            products: products
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        res.render('products', { 
            user: req.session.user || null,
            message: '',
            error: 'Failed to load products',
            gameFilter: null,
            products: []
        });
    } finally {
        await client.close();
    }
});

// GET route for filtered products by game
router.get('/:game', async (req, res) => {
    const game = req.params.game;
    const validGames = ['minecraft', 'stardewvalley', 'terraria', 'pokemon', 'harvestmoon'];

    if (!validGames.includes(game.toLowerCase())) {
        return res.redirect('/products');
    }

    try {
        await client.connect();
        const database = client.db('ecommerceDB');
        const productsCollection = database.collection('products');
        
        const products = await productsCollection.find({ genre: game.toLowerCase() }).sort({ createdAt: -1 }).toArray();
        
        res.render('products', { 
            user: req.session.user || null,
            message: req.flash('message'),
            error: req.flash('error'),
            gameFilter: game.toLowerCase(),
            products: products
        });
    } catch (error) {
        console.error('Error fetching filtered products:', error);
        res.render('products', { 
            user: req.session.user || null,
            message: '',
            error: 'Failed to load products',
            gameFilter: game.toLowerCase(),
            products: []
        });
    } finally {
        await client.close();
    }
});

module.exports = router;