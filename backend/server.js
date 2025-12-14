const express = require('express');
const session = require('express-session');
const SQLiteStore = require('./sqlite-session-store');
const argon2 = require('argon2');
const { validatePassword, hashPassword, comparePassword } = require('./modules/password-utils')
const app = express();
const path = require('path');
const hbs = require('hbs');
const cookieParser = require('cookie-parser');


const PORT = process.env.PORT || 3000;
const users = {};
const comments = [];

//USING METADATA FILE FORMAT (JSON) FOR PDF DETAILS

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


const sessionStore = new SQLiteStore({
  db: path.join(__dirname, 'sessions.db'),
  table: 'sessions'
});

app.use(session({
  store: sessionStore,
  secret: 'Ns789ySN&*Ysb7YN*AY&NSNywn7ynd&*YDB*&E',
  resave: false,
  saveUninitialized: false
}));

// Handle routes through router module
const router = require('./modules/router');
app.use('/', router);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});