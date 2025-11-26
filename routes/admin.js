const express = require('express');
const router = express.Router();
const { MongoClient, ObjectId } = require('mongodb');
const { isAdmin } = require('../middleware/auth');

const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

// All admin routes require admin privileges
router.use(isAdmin);

// Helper function to validate product input
function validateProductInput(body) {
    const errors = [];
    const name = (body.title || body.name || "").trim();
    const description = (body.description || "").trim();
    const category = (body.genre || body.category || "").trim();
    const priceRaw = (body.price || "").toString().trim();
    const price = Number(priceRaw);
    const imageUrl = (body.imageUrl || "").trim();

    if (!name) {
        errors.push("Product name is required.");
    } else if (name.length < 2) {
        errors.push("Product name must be at least 2 characters.");
    }

    if (!description) {
        errors.push("Description is required.");
    } else if (description.length < 5) {
        errors.push("Description must be at least 5 characters.");
    }

    if (!priceRaw) {
        errors.push("Price is required.");
    } else if (Number.isNaN(price)) {
        errors.push("Price must be a valid number.");
    } else if (price <= 0) {
        errors.push("Price must be greater than 0.");
    }

    if (!category) {
        errors.push("Category is required.");
    }

    const formData = {
        name,
        description,
        price: priceRaw, // keep raw input for the form
        category,
        imageUrl
    };

    return { errors, formData, priceNumber: price };
}

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
        
        // Handle search
        const searchQuery = (req.query.search || "").trim();
        const categoryFilter = (req.query.category || "").trim();
        
        let filter = {};
        if (searchQuery) {
            filter.$or = [
                { title: { $regex: searchQuery, $options: 'i' } },
                { name: { $regex: searchQuery, $options: 'i' } }
            ];
        }
        if (categoryFilter) {
            filter.$and = filter.$and || [];
            filter.$and.push({
                $or: [
                    { genre: categoryFilter.toLowerCase() },
                    { category: categoryFilter.toLowerCase() }
                ]
            });
        }
        
        const products = await productsCollection.find(filter).sort({ createdAt: -1 }).toArray();
        
        // Read query parameters for messages
        const success = req.query.success;
        const action = req.query.action;
        const error = req.query.error;
        
        let message = null;
        if (success === "1" && action === "created") {
            message = {
                type: "success",
                text: "Product created successfully."
            };
        } else if (success === "1" && action === "updated") {
            message = {
                type: "success",
                text: "Product updated successfully."
            };
        } else if (success === "1" && action === "deleted") {
            message = {
                type: "success",
                text: "Product deleted successfully."
            };
        } else if (error === "cannot_delete_used") {
            message = {
                type: "error",
                text: "Cannot delete this product because it is already used in one or more orders."
            };
        }
        
        res.render('admin/products', {
            products,
            user: req.session.user,
            message,
            searchQuery,
            categoryFilter
        });
    } catch (error) {
        console.error('Error fetching products:', error);
        req.flash('error', 'Failed to load products');
        res.redirect('/users/admin');
    } finally {
        await client.close();
    }
});

// GET - Add new product form
router.get('/products/new', (req, res) => {
    res.render('admin/product-new', {
        title: 'Admin – Add Product',
        user: req.session.user,
        errors: [],
        formData: {}
    });
});

// POST - Add new product with validation
router.post('/products', async (req, res) => {
    try {
        const db = req.app.locals.client || client;
        await db.connect();
        const database = db.db('ecommerceDB');
        const productsCollection = database.collection('products');

        const { errors, formData, priceNumber } = validateProductInput(req.body);

        if (errors.length > 0) {
            // Validation failed – show form again with errors
            await db.close();
            return res.status(400).render("admin/product-new", {
                title: "Admin – Add Product",
                user: req.session.user,
                errors,
                formData
            });
        }

        const now = new Date();
        const newProduct = {
            productId: "p-" + Date.now(),
            title: formData.name,
            name: formData.name,
            description: formData.description,
            price: priceNumber,
            genre: formData.category.toLowerCase(),
            category: formData.category.toLowerCase(),
            imageUrl: formData.imageUrl || '/images/placeholder.png',
            createdAt: now,
            updatedAt: now
        };

        await productsCollection.insertOne(newProduct);

        // Success path – redirect back to list
        res.redirect("/admin/products?success=1&action=created");
    } catch (err) {
        console.error("Error creating product:", err);
        res.status(500).send("Error creating product.");
    } finally {
        try {
            const db = req.app.locals.client || client;
            await db.close();
        } catch (e) {}
    }
});

// Keeping legacy route for backwards compatibility
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

// GET - Edit product form
router.get('/products/edit/:productId', async (req, res) => {
    try {
        await client.connect();
        const database = client.db('ecommerceDB');
        const productsCollection = database.collection('products');
        
        const productId = req.params.productId;
        
        // Try finding by productId string first, then by ObjectId
        let product = await productsCollection.findOne({ productId });
        if (!product) {
            product = await productsCollection.findOne({ _id: new ObjectId(productId) });
        }
        
        if (!product) {
            req.flash('error', 'Product not found');
            return res.redirect('/admin/products');
        }
        
        res.render('admin/product-edit', {
            title: 'Admin – Edit Product',
            user: req.session.user,
            errors: [],
            formData: {},
            product,
            productId: product.productId || product._id.toString()
        });
    } catch (error) {
        console.error('Error loading product:', error);
        req.flash('error', 'Failed to load product');
        res.redirect('/admin/products');
    } finally {
        await client.close();
    }
});

// POST - Update product with validation
router.post('/products/edit/:productId', async (req, res) => {
    try {
        const db = req.app.locals.client || client;
        await db.connect();
        const database = db.db('ecommerceDB');
        const productsCollection = database.collection('products');

        const productId = req.params.productId;
        const { errors, formData, priceNumber } = validateProductInput(req.body);

        if (errors.length > 0) {
            // Validation failed – show edit form again with errors
            // Load product for the form
            let product = await productsCollection.findOne({ productId });
            if (!product) {
                product = await productsCollection.findOne({ _id: new ObjectId(productId) });
            }
            
            await db.close();
            return res.status(400).render("admin/product-edit", {
                title: "Admin – Edit Product",
                user: req.session.user,
                errors,
                formData,
                product,
                productId
            });
        }

        const now = new Date();
        const updateData = {
            title: formData.name,
            name: formData.name,
            description: formData.description,
            price: priceNumber,
            genre: formData.category.toLowerCase(),
            category: formData.category.toLowerCase(),
            imageUrl: formData.imageUrl || '/images/placeholder.png',
            updatedAt: now
        };

        // Try updating by productId string first, then by ObjectId
        let result = await productsCollection.updateOne(
            { productId },
            { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
            result = await productsCollection.updateOne(
                { _id: new ObjectId(productId) },
                { $set: updateData }
            );
        }

        res.redirect("/admin/products?success=1&action=updated");
    } catch (err) {
        console.error("Error updating product:", err);
        res.status(500).send("Error updating product.");
    } finally {
        try {
            const db = req.app.locals.client || client;
            await db.close();
        } catch (e) {}
    }
});

// POST - Edit product (legacy route for backwards compatibility)
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

// POST - Delete product with safe delete check
router.post('/products/delete/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        await client.connect();
        const database = client.db('ecommerceDB');
        const productsCollection = database.collection('products');
        const ordersCollection = database.collection('orders');
        
        // Find the product to get its productId
        let product = await productsCollection.findOne({ _id: new ObjectId(id) });
        if (!product) {
            product = await productsCollection.findOne({ productId: id });
        }
        
        if (!product) {
            req.flash('error', 'Product not found');
            return res.redirect('/admin/products');
        }
        
        // Check if product is used in any orders
        const productIdToCheck = product.productId || product._id.toString();
        const orderWithProduct = await ordersCollection.findOne({
            'items.productId': productIdToCheck
        });
        
        // Also check by _id string
        const orderWithProductById = await ordersCollection.findOne({
            'items.productId': id
        });
        
        if (orderWithProduct || orderWithProductById) {
            return res.redirect('/admin/products?error=cannot_delete_used');
        }
        
        // Safe to delete
        const result = await productsCollection.deleteOne({ _id: new ObjectId(id) });
        
        if (result.deletedCount === 0) {
            req.flash('error', 'Product not found');
            return res.redirect('/admin/products');
        } else {
            res.redirect('/admin/products?success=1&action=deleted');
        }
    } catch (error) {
        console.error('Error deleting product:', error);
        req.flash('error', 'Failed to delete product. Please try again.');
        res.redirect('/admin/products');
    } finally {
        await client.close();
    }
});

// GET - Admin orders page
router.get('/orders', async (req, res) => {
    try {
        await client.connect();
        const database = client.db('ecommerceDB');
        const ordersCollection = database.collection('orders');
        
        const orders = await ordersCollection.find({}).sort({ createdAt: -1 }).toArray();
        
        res.render('admin/orders', {
            orders,
            user: req.session.user,
            message: req.flash('message') || '',
            error: req.flash('error') || ''
        });
    } catch (error) {
        console.error('Error fetching orders:', error);
        req.flash('error', 'Failed to load orders');
        res.redirect('/admin/dashboard');
    } finally {
        await client.close();
    }
});

// POST - Update order status
router.post('/orders/update-status/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { orderStatus } = req.body;
        
        // Validation
        const validStatuses = ['to_pay', 'to_ship', 'to_receive', 'completed', 'refund', 'cancelled'];
        if (!validStatuses.includes(orderStatus)) {
            req.flash('error', 'Invalid order status');
            return res.redirect('/admin/orders');
        }
        
        await client.connect();
        const database = client.db('ecommerceDB');
        const ordersCollection = database.collection('orders');
        
        const result = await ordersCollection.updateOne(
            { _id: new ObjectId(id) },
            { 
                $set: { 
                    orderStatus: orderStatus,
                    updatedAt: new Date()
                }
            }
        );
        
        if (result.matchedCount === 0) {
            req.flash('error', 'Order not found');
        } else {
            req.flash('message', `Order status updated to "${orderStatus.replace('_', ' ')}"`);
        }
        
        res.redirect('/admin/orders');
    } catch (error) {
        console.error('Error updating order status:', error);
        req.flash('error', 'Failed to update order status');
        res.redirect('/admin/orders');
    } finally {
        await client.close();
    }
});

module.exports = router;
