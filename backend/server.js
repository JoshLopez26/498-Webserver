const express = require('express');
const session = require('express-session');
const SQLiteStore = require('./sqlite-session-store');
const app = express();
const path = require('path');
const hbs = require('hbs');
const cookieParser = require('cookie-parser');
//const db = require('./database');
const authRoutes = require('./routes/auth');
const { requireAuth } = require('./modules/auth-middleware');


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
app.use(express.json()); // Parse JSON bodies

// Session configuration with SQLite store (from Chapter 10)
const sessionStore = new SQLiteStore({
  db: path.join(__dirname, 'sessions.db'),
  table: 'sessions'
});

// Initialize user session
app.use(session({
    store: sessionStore,
    secret: 'Ns789ySN&*Ysb7YN*AY&NSNywn7ynd&*YDB*&ETbrtryBB567br^97btt^%V5VR%E5rC5&',
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

app.use('/api/auth', authRoutes);

// Protected route example (doing this manually by sending)
app.get('/api/protected', requireAuth, (req, res) => {
  res.send(`Protected route that needs authentication. User: ${req.session.username} ID: ${req.session.userId}`);
});


// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

// Graceful shutdown, this will help the session to close the db gracefully since we're now using it.
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  sessionStore.close();
  process.exit(0);
});