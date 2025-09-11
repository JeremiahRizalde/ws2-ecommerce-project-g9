//server.js

const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const session = require('express-session'); // Added for user sessions
<<<<<<< HEAD
const flash = require('connect-flash');
=======
>>>>>>> 2be40e61ca7033bb242098e61f8f3d15fb51deca
require('dotenv').config();


const app = express();
const PORT = process.env.PORT || 3000;

//Middleware
app.use(bodyParser.urlencoded({ extended: true}));
app.set('view engine', 'ejs');
<<<<<<< HEAD
app.use(express.static('public'));
=======
>>>>>>> 2be40e61ca7033bb242098e61f8f3d15fb51deca

// Session setup
app.use(session({
    secret: process.env.SESSION_SECRET || "default_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // set to true only if using HTTPS
<<<<<<< HEAD
        maxAge: 15 * 60 * 1000 // 15 minutes (in milliseconds)
    }
}));

// Flash messages
app.use(flash());

// Authentication middleware
const { checkAuthenticated } = require('./middleware/auth');
app.use(checkAuthenticated);
=======
        maxAge: 2 * 60 * 1000 // 15 minutes (in milliseconds)
    }

}));


>>>>>>> 2be40e61ca7033bb242098e61f8f3d15fb51deca

//Routes
const indexRoute = require('./routes/index');
const usersRoute = require('./routes/users');
const passwordRoute = require('./routes/password');
<<<<<<< HEAD
const contactRoute = require('./routes/contact');
const productsRoute = require('./routes/products');

app.use('/', indexRoute);
app.use('/users', usersRoute);
app.use('/password', passwordRoute);
app.use('/contact', contactRoute);
app.use('/products', productsRoute);
=======
app.use('/password', passwordRoute);

app.use('/', indexRoute);
app.use('/users', usersRoute);
>>>>>>> 2be40e61ca7033bb242098e61f8f3d15fb51deca


//MongoDB Setup
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

// Expose client & dbName to routes
app.locals.client = client;
app.locals.dbName = process.env.DB_NAME || "ecommerceDB";

<<<<<<< HEAD
// Remove the conflicting route
// app.get('/', (req, res) => {
//     res.send("Hello, MongoDB is connected!");
// });

=======
>>>>>>> 2be40e61ca7033bb242098e61f8f3d15fb51deca


async function main() {
    try{
        await client.connect();
        console.log("Connected to MongoDB Atlas");

        //Select Database
        const database = client.db("ecommerceDB");

<<<<<<< HEAD
        // Comment out the test route that might be overriding our routes
        // Temporary test route
        // app.get('/', (req, res) => {
        //     res.send("Hello, MongoDB is connected!");
        // });
=======
        //Temporary test route
        app.get('/', (req, res) => {
            res.send("Hello, MongoDB is connected!");
        });
>>>>>>> 2be40e61ca7033bb242098e61f8f3d15fb51deca

        //Start Server
        app.listen(PORT, ()=> {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    }catch(err){
        console.error("MongoDB connection failed", err);
    }
}

main();
