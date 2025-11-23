const express = require('express');
const session = require('express-session');
const app = express();
const path = require('path');
const hbs = require('hbs');
const cookieParser = require('cookie-parser');


const PORT = process.env.PORT || 3000;
const users = {};
const comments = [];

//USING METADATA FILE FORMAT

// Set view engine and views directory
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.set('modules', path.join(__dirname, 'modules'));

// Set up partials
hbs.registerPartials(path.join(__dirname, 'views/partials'));

// Middleware to parse form submits
app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname + '/public'));
app.use(cookieParser());

// Initialize user session
app.use(session({
    secret: 'Ns789ySN&*Ysb7YN*AY&NSNywn7ynd&*YDB*&E',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Handle routes through router module
const router = require('./modules/router')(users, comments);
app.use('/', router);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});