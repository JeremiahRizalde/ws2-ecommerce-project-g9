//server.js

const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
const session = require('express-session'); // Added for user sessions
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(` Server running on port ${PORT}`);
});


//const port = 3000;

//Middleware
app.use(bodyParser.urlencoded({ extended: true}));
app.set('view engine', 'ejs');

// Session setup
app.use(session({
    secret: process.env.SESSION_SECRET || 'dev-secret', // keep secret in .env
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // set true in production with HTTPS
    }));

//Routes
const indexRoute = require('./routes/index');
const usersRoute = require('./routes/users');

app.use('/', indexRoute);
app.use('/users', usersRoute);


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

        //Temporary test route
        app.get('/', (req, res) => {
            res.send("Hello, MongoDB is connected!");
        });

        //Start Server
        app.listen(PORT, ()=> {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    }catch(err){
        console.error("MongoDB connection failed", err);
    }
}

main();


/*

//server.js

const express = require('express');
const bodyParser = require('body-parser');
const { MongoClient } = require('mongodb');
require('dotenv').config();

const app = express();
const port = 3000;

//Middleware
app.use(bodyParser.urlencoded({ extended: true}));
app.set('view engine', 'ejs');

//Routes
const indexRoute = require('./routes/index');
const usersRoute = require('./routes/users');

app.use('/', indexRoute);
app.use('/users', usersRoute);


//MongoDB Setup
const uri = process.env.MONGO_URI;
const client = new MongoClient(uri);

async function main() {
    try{
        await client.connect();
        console.log("Connected to MongoDB Atlas");

        //Select Database
        const database = client.db("ecommerceDB");

        //Temporary test route
        app.get('/', (req, res) => {
            res.send("Hello, MongoDB is connected!");
        });

        //Start Server
        app.listen(port, ()=> {
            console.log(`Server running at http://localhost:${port}`);
        });
    }catch(err){
        console.error("MongoDB connection failed", err);
    }
}

main();
*/