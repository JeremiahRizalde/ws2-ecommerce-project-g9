//server.js

const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const session = require('express-session'); // Added for user sessions
const flash = require('connect-flash');
require('dotenv').config();
const path = require('path');
const fs = require('fs');

const mongoose = require("mongoose");

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

//Middleware
app.use(bodyParser.urlencoded({ extended: true}));
app.set('view engine', 'ejs');
app.use(express.static('public'));

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
    '/password/reset'    
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
const cartRoute = require('./routes/cart'); // Added cart route

app.use('/', indexRoute);
app.use('/users', usersRoute);
app.use('/password', passwordRoute);
app.use('/contact', contactRoute);
app.use('/products', productsRoute);
app.use('/cart', cartRoute); // Use cart route


//MongoDB Setup
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

// Expose client & dbName to routes
app.locals.client = client;
app.locals.dbName = process.env.DB_NAME || "ecommerceDB";



async function main() {
    try{
        await client.connect();
        console.log("Connected to MongoDB Atlas");

        //Select Database
        const database = client.db("ecommerceDB");

        // Comment out the test route that might be overriding our routes
        // Temporary test route
        // app.get('/', (req, res) => {
        //     res.send("Hello, MongoDB is connected!");
        // });

        //Start Server
        app.listen(PORT, ()=> {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    }catch(err){
        console.error("MongoDB connection failed", err);
    }
}

main();
