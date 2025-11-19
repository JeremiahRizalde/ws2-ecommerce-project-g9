const express = require('express');
const router = express.Router();
const { MongoClient, ObjectId } = require('mongodb');
const { isAdmin } = require('../middleware/auth');

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

// All admin routes require admin privileges
router.use(isAdmin);

// GET - Admin dashboard
router.get('/dashboard', (req, res) => {
    res.render('admin/dashboard', {
        user: req.session.user,
        message: req.flash('message') || '',
        error: req.flash('error') || ''
    });
});

// GET - Admin products view (public store preview)
router.get('/productsView', async (req, res) => {
    try {
        await client.connect();
        const database = client.db('ecommerceDB');
        const productsCollection = database.collection('products');
        
        const products = await productsCollection.find({}).sort({ createdAt: -1 }).toArray();
        
        res.render('admin/productsView', {
            products,
            user: req.session.user,
            message: req.flash('message') || '',
            error: req.flash('error') || ''
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        req.flash('error', 'Failed to load products');
        res.redirect('/admin/dashboard');
    } finally {
        await client.close();
    }
});

// GET - Admin products management page
router.get('/products', async (req, res) => {
    try {
        await client.connect();
        const database = client.db('ecommerceDB');
        const productsCollection = database.collection('products');
        
        const products = await productsCollection.find({}).sort({ createdAt: -1 }).toArray();
        
        res.render('admin/products', {
            products,
            user: req.session.user,
            message: req.flash('message') || '',
            error: req.flash('error') || ''
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        req.flash('error', 'Failed to load products');
        res.redirect('/users/admin');
    } finally {
        await client.close();
    }
});

// POST - Add new product
router.post('/products/add', async (req, res) => {
    try {
        const { title, description, genre, price, imageUrl } = req.body;
        
        // Validation
        if (!title || !description || !genre || !price || !imageUrl) {
            req.flash('error', 'All fields are required');
            return res.redirect('/admin/products');
        }
        
        await client.connect();
        const database = client.db('ecommerceDB');
        const productsCollection = database.collection('products');
        
        const newProduct = {
            title: title.trim(),
            description: description.trim(),
            genre: genre.toLowerCase(),
            price: parseFloat(price),
            imageUrl: imageUrl.trim(),
            createdAt: new Date(),
            updatedAt: new Date()
        };
        
        await productsCollection.insertOne(newProduct);
        
        req.flash('message', `Product "${title}" added successfully!`);
        res.redirect('/admin/products');
    } catch (error) {
        console.error('Error adding product:', error);
        req.flash('error', 'Failed to add product. Please try again.');
        res.redirect('/admin/products');
    } finally {
        await client.close();
    }
});

// POST - Edit product
router.post('/products/edit/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, genre, price, imageUrl } = req.body;
        
        // Validation
        if (!title || !description || !genre || !price || !imageUrl) {
            req.flash('error', 'All fields are required');
            return res.redirect('/admin/products');
        }
        
        await client.connect();
        const database = client.db('ecommerceDB');
        const productsCollection = database.collection('products');
        
        const updateData = {
            title: title.trim(),
            description: description.trim(),
            genre: genre.toLowerCase(),
            price: parseFloat(price),
            imageUrl: imageUrl.trim(),
            updatedAt: new Date()
        };
        
        const result = await productsCollection.updateOne(
            { _id: new ObjectId(id) },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            req.flash('error', 'Product not found');
        } else {
            req.flash('message', `Product "${title}" updated successfully!`);
        }
        
        res.redirect('/admin/products');
    } catch (error) {
        console.error('Error updating product:', error);
        req.flash('error', 'Failed to update product. Please try again.');
        res.redirect('/admin/products');
    } finally {
        await client.close();
    }
});

// POST - Delete product
router.post('/products/delete/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        await client.connect();
        const database = client.db('ecommerceDB');
        const productsCollection = database.collection('products');
        
        const result = await productsCollection.deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
            req.flash('error', 'Product not found');
        } else {
            req.flash('message', 'Product deleted successfully!');
        }
        
        res.redirect('/admin/products');
    } catch (error) {
        console.error('Error deleting product:', error);
        req.flash('error', 'Failed to delete product. Please try again.');
        res.redirect('/admin/products');
    } finally {
        await client.close();
    }
});

module.exports = router;
