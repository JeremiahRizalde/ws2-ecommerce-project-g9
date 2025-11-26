const express = require('express');
const router = express.Router();
const { MongoClient, ObjectId } = require('mongodb');
const { v4: uuidv4 } = require('uuid');

const requireLogin = require('../middleware/requireLogin');

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

// POST - Checkout and create order
router.post('/checkout', requireLogin, async (req, res) => {
    try {
        await client.connect();
        const db = client.db('ecommerceDB');
        const productsCollection = db.collection('products');
        const ordersCollection = db.collection('orders');
        
        const user = req.session.user;
        
        // Handle both array formats: items[] from test form or JSON from cart
        let itemsFromClient = req.body.items;
        
        // If items is a JSON string, parse it
        if (typeof itemsFromClient === 'string') {
            try {
                itemsFromClient = JSON.parse(itemsFromClient);
            } catch (e) {
                itemsFromClient = [];
            }
        }
        
        // If items is an object (from form array), convert to array
        if (itemsFromClient && !Array.isArray(itemsFromClient)) {
            itemsFromClient = Object.values(itemsFromClient);
        }
        
        // Filter out empty items
        itemsFromClient = (itemsFromClient || []).filter(item => item && item.productId);
        
        if (itemsFromClient.length === 0) {
            req.flash('error', 'No items provided for checkout.');
            return res.redirect('/orders/test-checkout');
        }
        
        // Get all productIds from the request and validate them
        const productIds = [];
        for (const item of itemsFromClient) {
            const cleanId = item.productId.trim();
            // Check if it's a valid 24-character hex string
            if (/^[0-9a-fA-F]{24}$/.test(cleanId)) {
                productIds.push(new ObjectId(cleanId));
            } else {
                req.flash('error', `Invalid product ID: ${item.productId}`);
                return res.redirect('/orders/test-checkout');
            }
        }
        
        // Load product data from the products collection
        const products = await productsCollection
            .find({ _id: { $in: productIds } })
            .toArray();
        
        // Build order items and compute subtotals
        const orderItems = itemsFromClient.map(item => {
            const cleanId = item.productId.trim();
            const product = products.find(p => p._id.toString() === cleanId);
            const quantity = parseInt(item.quantity, 10) || 1;
            const price = product ? Number(product.price) : 0;
            const subtotal = price * quantity;
            
            return {
                productId: cleanId,
                name: product ? product.title : 'Unknown',
                price,
                quantity,
                subtotal
            };
        });
        
        // Compute totalAmount
        const totalAmount = orderItems.reduce(
            (sum, item) => sum + item.subtotal,
            0
        );
        
        const now = new Date();
        const newOrder = {
            orderId: uuidv4(),
            userId: user.userId,
            customerName: `${user.firstName} ${user.lastName}`,
            customerEmail: user.email,
            items: orderItems,
            totalAmount,
            orderStatus: 'to_pay',
            createdAt: now,
            updatedAt: now
        };
        
        await ordersCollection.insertOne(newOrder);
        
        req.flash('message', `Order placed successfully! Order ID: ${newOrder.orderId}`);
        
        // Signal to clear cart (frontend will handle this)
        req.session.clearCart = true;
        
        res.redirect('/orders/success');
    } catch (err) {
        console.error('Error during checkout:', err);
        req.flash('error', 'Error placing order.');
        res.redirect('/orders/test-checkout');
    } finally {
        await client.close();
    }
});

// GET - Order success page
router.get('/success', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/users/login');
    }
    
    res.render('order-success', {
        user: req.session.user,
        message: req.flash('message') || '',
        error: req.flash('error') || ''
    });
});

// GET - Test checkout form (for testing during development)
router.get('/test-checkout', requireLogin, (req, res) => {
    res.render('test-checkout', {
        user: req.session.user,
        message: req.flash('message') || '',
        error: req.flash('error') || ''
    });
});

// GET - View user's order history
router.get('/my-orders', requireLogin, async (req, res) => {
    try {
        await client.connect();
        const database = client.db('ecommerceDB');
        const ordersCollection = database.collection('orders');
        
        const orders = await ordersCollection
            .find({ userId: req.session.user.userId })
            .sort({ createdAt: -1 })
            .toArray();
        
        res.render('my-orders', {
            user: req.session.user,
            orders: orders,
            message: req.flash('message') || '',
            error: req.flash('error') || ''
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        req.flash('error', 'Failed to load orders');
        res.redirect('/users/dashboard');
    } finally {
        await client.close();
    }
});

// GET - Test protected route (for testing requireLogin middleware)
router.get('/test-protected', requireLogin, (req, res) => {
    res.send('You are logged in. Protected route works.');
});

module.exports = router;
