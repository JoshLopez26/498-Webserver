const express = require('express');
const session = require('express-session');
const app = express();
const path = require('path');
const hbs = require('hbs');
const cookieParser = require('cookie-parser');

const PORT = process.env.PORT || 3000;
const users = {};
const comments = [];

// Set view engine and views directory
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
hbs.registerPartials(path.join(__dirname, 'views/partials'));

// Middleware to parse form submits
app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname + '/public'));
app.use(cookieParser());

app.use(session({
    secret: 'Ns789ySN&*Ysb7YN*AY&NSNywn7ynd&*YDB*&E',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Home page - shows static user data
app.get('/', (req, res) => {
    let user = {  // We keep the Guest object to act as a default if there is no session
        name: "Guest",
        isLoggedIn: false,
        loginTime: null,
        visitCount: 0
    };
    
    // Check if user is logged in via session
    if (req.session.isLoggedIn) {
        user = {
            name: req.session.username,
            isLoggedIn: true,
            loginTime: req.session.loginTime,
            visitCount: req.session.visitCount || 0
        };
        
        // Increment visit count
        req.session.visitCount = (req.session.visitCount || 0) + 1;
    }

    res.render('home', { user: user });
});

// Login page
app.get('/login', (req, res) => {
    res.render('login');
});

// Handle login form submission (no session functionality yet)
app.post('/login', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    if (!username || !password) {
        return res.send("Username and password required.");
    }

    // Check if user exists and password matches
    if (users[username] && users[username] === password) {
        req.session.isLoggedIn = true;
        req.session.username = username;
        req.session.loginTime = new Date().toISOString();
        req.session.visitCount = 0;

        console.log(`User ${username} logged in at ${req.session.loginTime}`);
        res.redirect('/');
    } else {
        res.send("Invalid username or password.");
    }
});

// Register page
app.get('/register', (req, res) => {
    res.render('register');
});

// Handle register form submission (no session functionality yet)
app.post('/register', (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    if (!username || !password) {
        return res.send("Username and password required.");
    }

    if (users[username]) {
        return res.send("Username already exists. Please log in instead.");
    }

    // Save new user
    users[username] = password;
    console.log(`Registered new user: ${username}`);

    // Log them in right after registering
    req.session.isLoggedIn = true;
    req.session.username = username;
    req.session.loginTime = new Date().toISOString();
    req.session.visitCount = 0;

    res.redirect('/');
});

// Register page
app.get('/comments', (req, res) => {
    res.render('comments', {comments});
});

// Handle comments (no session functionality yet)
app.post('/comment', (req, res) => {
    const comment = req.body.comment;
    
    if(comment)
    {
        comments.push(comment);
        console.log(`Sent comment: ${comment}`)
    }
    else
    {
        return res.send("Can't submit empty comment.");
    }
    res.render("comments");
});

// Add comment
app.get('/comment/new', (req, res) => {
    res.render('comment/new');
});

// Logout user (no session check yet)
app.post('/logout', (req, res) => {
    if(req.session)
    {
        req.session.destroy((err) => {
            if (err) {
                console.log('Error destroying session:', err);
            }
        });
    }
    res.clearCookie('name'); // if you used a cookie named 'username'
    res.redirect('/');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});