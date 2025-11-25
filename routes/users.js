// routes/users.js
const verifyTurnstile = require('../utils/turnstileVerify');

const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');
const saltRounds = 12;


// Base URL: local (http://localhost:3000) or deployed (https://yourapp.onrender.com)
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';


//lesson10: sending real verification emails with resend
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

// Registration (POST)
router.post('/register', async (req, res) => {
    const token = req.body['cf-turnstile-response'];
    const result = await verifyTurnstile(token, req.ip);
    if (!result.success) {
        return res.status(400).render('register', { error: 'Verification failed. Please try again.' });
    }

    try {
        const db = req.app.locals.client.db(req.app.locals.dbName);
        const usersCollection = db.collection('users');
        
        // 1. Check if user already exists by email
        const existingUser = await usersCollection.findOne({ email: req.body.email });

        if (existingUser) return res.send("User already exists with this email.");
    
        // 2. Hash password
        const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);
        const currentDate = new Date();

        // 3. Create verification token
        const token = uuidv4();
        
        // 4. Build new user object
        const newUser = {
            userId: uuidv4(), // unique ID for the user
            firstName: req.body.firstName, // from form input
            lastName: req.body.lastName,
            email: req.body.email,
            passwordHash: hashedPassword, // never store plain text password
            role: 'customer', // default role
            accountStatus: 'active',
            isEmailVerified: true, // must be verified before login
            verificationToken: token, // link user to verification
            tokenExpiry: new Date(Date.now() + 3600000), // expires in 1 hour
            createdAt: currentDate,
            updatedAt: currentDate
        };
        

        // 5. Insert into database
        await usersCollection.insertOne(newUser);

        const verificationUrl = `${baseUrl}/users/verify/${token}`;
        await resend.emails.send({
            from: process.env.RESEND_FROM_EMAIL, // stored in .env
            to: newUser.email,
            subject: 'Verify your account',
            html: `
            <h2>Welcome, ${newUser.firstName}!</h2>
            <p>Thank you for registering. Please verify your email by clicking the link
            below:</p>
            <a href="${verificationUrl}">${verificationUrl}</a>
            `
        });


        } catch (err) {
            console.error("Error saving user:", err);
            res.send("Something went wrong.");
        }
});




// MongoDB setup
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);
const dbName = "ecommerceDB";

// Show login form
router.get('/login', (req, res) => {
    const message = req.query.message || req.flash('message');
    const error = req.flash('error');
    res.render('login', { 
        title: "Login - Pixel Gamer Shop", 
        message, 
        error,
        user: req.session.user || null
    });
});

// Show registration form
router.get('/register', (req, res) => {
    res.render('register', { 
        title: "Register - Pixel Gamer Shop",
        error: req.flash('error'),
        user: req.session.user || null
    });
});

// Dashboard route - User overview and order counts
router.get('/dashboard', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/users/login?message=timeout'); // redirect with message
    }
    
    // Redirect admins to admin dashboard
    if (req.session.user.role === 'admin') {
        return res.redirect('/admin/dashboard');
    }
    
    try {
        const db = req.app.locals.client.db(req.app.locals.dbName);
        const ordersCollection = db.collection("orders");
        const user = req.session.user;
        
        // Load all orders for this user
        const userOrders = await ordersCollection
            .find({ userId: user.userId })
            .sort({ createdAt: -1 })
            .toArray();
        
        // Prepare counts per status
        const statusCounts = {
            to_pay: 0,
            to_ship: 0,
            to_receive: 0,
            completed: 0,
            refund: 0,
            cancelled: 0
        };
        
        userOrders.forEach(order => {
            const status = order.orderStatus;
            if (statusCounts[status] !== undefined) {
                statusCounts[status] += 1;
            }
        });
        
        const totalOrders = userOrders.length;
        
        res.render('dashboard', { 
            title: "User Dashboard", 
            user: req.session.user,
            statusCounts,
            totalOrders
        });
    } catch (err) {
        console.error("Error loading user dashboard:", err);
        res.status(500).send("Error loading dashboard.");
    }
});

// GET /users/profile - view profile
router.get('/profile', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/users/login?message=timeout');
    }
    
    try {
        const db = req.app.locals.client.db(req.app.locals.dbName);
        const usersCollection = db.collection("users");
        const userFromSession = req.session.user;
        
        // Load the latest data from DB
        const user = await usersCollection.findOne({ userId: userFromSession.userId });
        
        const updated = req.query.updated === "1";
        
        res.render("user-profile", {
            title: "User Profile",
            user,
            updated
        });
    } catch (err) {
        console.error("Error loading user profile:", err);
        res.status(500).send("Error loading profile.");
    }
});

// POST /users/profile - update profile
router.post('/profile', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/users/login?message=timeout');
    }
    
    try {
        const db = req.app.locals.client.db(req.app.locals.dbName);
        const usersCollection = db.collection("users");
        const userFromSession = req.session.user;
        
        const address = (req.body.address || "").trim();
        const contactNumber = (req.body.contactNumber || "").trim();
        
        await usersCollection.updateOne(
            { userId: userFromSession.userId },
            {
                $set: {
                    address,
                    contactNumber
                }
            }
        );
        
        // Optionally update session copy
        req.session.user.address = address;
        req.session.user.contactNumber = contactNumber;
        
        // Redirect back with a query flag
        res.redirect("/users/profile?updated=1");
    } catch (err) {
        console.error("Error updating user profile:", err);
        res.status(500).send("Error updating profile.");
    }
});

// GET /users/orders - purchase history for the logged-in user
router.get("/orders", async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/users/login?message=timeout');
    }
    
    try {
        const db = req.app.locals.client.db(req.app.locals.dbName);
        const ordersCollection = db.collection("orders");
        const userFromSession = req.session.user;
        
        // Load all orders for this user
        const userOrders = await ordersCollection
            .find({ userId: userFromSession.userId })
            .sort({ createdAt: -1 })
            .toArray();
        
        // Group orders by status
        const ordersByStatus = {
            to_pay: [],
            to_ship: [],
            to_receive: [],
            completed: [],
            refund: [],
            cancelled: []
        };
        
        userOrders.forEach(order => {
            const status = order.orderStatus;
            if (ordersByStatus[status]) {
                ordersByStatus[status].push(order);
            }
        });
        
        res.render("user-orders", {
            title: "My Orders",
            user: userFromSession,
            ordersByStatus
        });
    } catch (err) {
        console.error("Error loading user orders:", err);
        res.status(500).send("Error loading orders.");
    }
});

// Admin view
router.get('/admin', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).send("Access denied.");
    }

    const db = req.app.locals.client.db(req.app.locals.dbName);
    const users = await db.collection('users').find().toArray();
    res.render('admin', {
        title: "Admin Dashboard",
        users,
        currentUser: req.session.user
        });
    });

// Logout route
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Error destroying session:", err);
            return res.send("Something went wrong during logout.");
        }
        // res.clearCookie('connect.sid'); // force browser to drop cookie
        res.redirect('/users/login?message=loggedOut');
    });
});

// Handle login form submission
router.post('/login', async (req, res) => {
    const token = req.body['cf-turnstile-response'];
    const result = await verifyTurnstile(token, req.ip);

    if (!result.success) {
        return res.status(400).render('login', { error: 'Verification failed. Please try again.' });
    }

    try {
        const db = req.app.locals.client.db(req.app.locals.dbName);
        const usersCollection = db.collection('users');

        // Find user by email
        const user = await usersCollection.findOne({ email: req.body.email });
        if (!user) return res.send("User not found.");

        // Check if account is active
        if (user.accountStatus !== 'active') return res.send("Account is not active.");
        
        // Verify email by logging in
        if (!user.isEmailVerified) {
            return res.send("Please verify your email before logging in.");
        }

        // Compare hashed password
        const isPasswordValid = await bcrypt.compare(req.body.password,user.passwordHash);
        if (isPasswordValid) {

            // Store session
            req.session.user = {
                userId: user.userId,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                isEmailVerified: user.isEmailVerified
            };
            
            // Redirect based on role
            if (user.role === 'admin') {
                res.redirect('/admin/dashboard');
            } else {
                res.redirect('/users/dashboard');
            }
        } else {
            res.send("Invalid password.");
        }
        
    } catch (err) {
        console.error("Error during login:", err);
        res.send("Something went wrong.");
    }
});


// Email Verification Route
router.get('/verify/:token', async (req, res) => {
    try {
        const db = req.app.locals.client.db(req.app.locals.dbName);
        const usersCollection = db.collection('users');

        // 1. Find user by token
        const user = await usersCollection.findOne({ verificationToken: req.params.token });

        // 2. Check if token exists
        if (!user) {
            return res.send("Invalid or expired verification link.");
        }

    // 3. Check if token is still valid
        if (user.tokenExpiry < new Date()) {
            return res.send("Verification link has expired. Please register again.");
        }

    // 4. Update user as verified
        await usersCollection.updateOne(
            { verificationToken: req.params.token },
            { $set: { isEmailVerified: true }, $unset: { verificationToken: "", tokenExpiry:"" } }
        );

    res.send(`
        <h2>Email Verified!</h2>
        <p>Your account has been verified successfully.</p>
        <a href="/users/login">Proceed to Login</a>
    `);
        } catch (err) {
        console.error("Error verifying user:", err);
        res.send("Something went wrong during verification.");
        }
    });


// Show all registered users
router.get('/list', async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        const usersCollection = db.collection('users');
        const users = await usersCollection.find().toArray();
        res.render('users-list', { title: "Registered Users", users: users });
    } catch (err) {
        console.error("Error fetching users:", err);
        res.send("Something went wrong.");
    }
});

const { ObjectId } = require('mongodb');

// Show edit form
router.get('/edit/:id', async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        const usersCollection = db.collection('users');

        const user = await usersCollection.findOne({ _id: new
        ObjectId(req.params.id) });
            if (!user) {
                return res.send("User not found.");
            }
        res.render('edit-user', { title: "Edit User", user: user });
    } catch (err) {
    console.error("Error loading user:", err);
    res.send("Something went wrong.");
}
});

// Handle update form
router.post('/edit/:id', async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        const usersCollection = db.collection('users');
        await usersCollection.updateOne(
            { _id: new ObjectId(req.params.id) },
            { $set: { name: req.body.name, email: req.body.email } }
        );
        res.redirect('/users/list');
    } catch (err) {
        console.error("Error updating user:", err);
        res.send("Something went wrong.");
    }
});


// Delete user
router.post('/delete/:id', async (req, res) => {
    try {
        await client.connect();
        const db = client.db(dbName);
        const usersCollection = db.collection('users');
        
        await usersCollection.deleteOne({ _id: new ObjectId(req.params.id) });
        res.redirect('/users/list');
    } catch (err) {
        console.error("Error deleting user:", err);
        res.send("Something went wrong.");
    }
});

// inside routes/users.js (at the end)
router.use((req, res) => {
    res.status(404).render('404', { title: 'Page Not Found' })
})

module.exports = router;


