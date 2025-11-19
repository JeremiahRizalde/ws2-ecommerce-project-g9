//server.js
const verifyTurnstile = require('./utils/turnstileVerify');
const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const session = require('express-session'); // Added for user sessions
const flash = require('connect-flash');
require('dotenv').config();
const path = require('path');
const fs = require('fs');

const mongoose = require("mongoose");

//Lesson 14
const helmet = require('helmet')
const compression = require('compression')

async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      tls: true, // important for Atlas SSL
    });
    console.log("MongoDB connected successfully");
  } catch (err) {
    console.error("MongoDB connection failed", err);
    process.exit(1);
  }
}

connectDB();


const app = express();
const PORT = process.env.PORT || 3000;

// Production middleware (should be first)
app.set('trust proxy', 1); // if behind Render proxy

// app.use(helmet()); // sensible security headers - uncomment when you install helmet
// app.use(compression()); // smaller responses - uncomment when you install compression

//Middleware
app.use(bodyParser.urlencoded({ extended: true}));
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use((req, res, next) => {
  res.locals.message = (req.flash && req.flash('message')) || null;
  next();
});

// near the top of server.js, after session middleware
app.use((req, res, next) => {
  res.locals.user = req.session?.user || null
  next()
})

// Set views path explicitly
app.set('views', path.join(__dirname, 'views'));

// Add a helper function for includes
app.locals.include = function(filename) {
  const filepath = path.join(__dirname, 'views', filename);
  return fs.readFileSync(filepath, 'utf8');
};

// Session setup
app.use(session({
    secret: process.env.SESSION_SECRET || "default_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // set to true only if using HTTPS
        maxAge: 15 * 60 * 1000 // 15 minutes (in milliseconds)
    }
}));

// Flash messages
app.use(flash());

// Authentication middleware
app.use((req, res, next) => {
  // Make user data available to all templates
  res.locals.user = req.session.user || null;
  next();
});

// Route protection middleware
const requireLogin = (req, res, next) => {
  // Exclude these paths from requiring login
  const publicPaths = [
    '/users/login', 
    '/users/register', 
    '/password/forgot',  
    '/password/reset',
    '/sitemap.xml',      // Allow public access to sitemap
    '/health'            // Allow public access to health check
  ];
  
  // Also allow any path that starts with /password/reset/ (for token-based reset)
  if (req.path.startsWith('/password/reset/')) {
    return next();
  }
  
  if (!req.session.user && !publicPaths.includes(req.path)) {
    // Store the requested URL to redirect back after login
    req.session.returnTo = req.originalUrl;
    return res.redirect('/users/login');
  }
  
  next();
};
// Apply route protection to all routes except public ones
app.use(requireLogin);

//Routes
const indexRoute = require('./routes/index');
const usersRoute = require('./routes/users');
const passwordRoute = require('./routes/password');
const contactRoute = require('./routes/contact');
const productsRoute = require('./routes/products');
const cartRoute = require('./routes/cart'); 
const adminRoute = require('./routes/admin'); 

// Health check endpoint (for Render/monitoring)
app.get('/health', (req, res) => res.type('text').send('ok'));

// Serve sitemap.xml with correct content type
app.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.sendFile(path.join(__dirname, 'sitemap.xml'));
});

// TEST 500 ERROR 
app.get('/crash', (req, res) => {
  throw new Error('Test crash');
});

app.get('/crash-async', async (req, res, next) => {
  try {
    throw new Error('Async crash');
    } catch (err) {
    next(err);
    }
});

app.use('/', indexRoute);
app.use('/users', usersRoute);
app.use('/password', passwordRoute);
app.use('/contact', contactRoute);
app.use('/products', productsRoute);
app.use('/cart', cartRoute);
app.use('/admin', adminRoute);




//MongoDB Setup
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

// Expose client & dbName to routes
app.locals.client = client;
app.locals.dbName = process.env.DB_NAME || "ecommerceDB";

// 404 handler (must be the last route)
app.use((req, res, next) => {
  console.warn('404:', req.method, req.originalUrl, 'referrer:', req.get('referer') || '-');
  res.set('Cache-Control', 'no-store');
  res.status(404).render('404', { title: "Page Not Found" });
});


// 500 handler (last)
app.use((err, req, res, next) => {
  console.error(err.stack);
  if (res.headersSent) return next(err);
    res.status(500).render('500', { title: 'Server Error' });
});



async function main() {
    try{
        await client.connect();
        console.log("Connected to MongoDB Atlas");

        //Select Database
        const database = client.db("ecommerceDB");

        //Start Server
        app.listen(PORT, ()=> {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    }catch(err){
        console.error("MongoDB connection failed", err);
    }
}

main();