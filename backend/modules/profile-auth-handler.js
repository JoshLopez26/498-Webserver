// Handle basic login / register / logout / profile features and routing

const express = require('express');
const router = express.Router();

const db = require('../database');
const { validatePassword, hashPassword, comparePassword } = require('./password-utils')
const loginTracker = require('./login-tracker');
const { requireAuth, checkLoginLockout, getClientIP } = require('./auth-middleware');

// Test if name format is valid
function isValidName(name) {
    const pattern = /^[A-Za-z0-9_]+$/;
    if (!pattern.test(name)) return false;
    return true;
}

// Render Login page
router.get('/login', (req, res) => {
    res.render('login', {
        error: req.query.error
    });
});

// Handle login form submission
router.post('/login', checkLoginLockout, async (req, res) => {
    try {
        const { username, password } = req.body;
        const ipAddress = getClientIP(req);
        
        // Validate input
        if (!username || !password) {
            if (username) {
                loginTracker.recordAttempt(ipAddress, username, false);
            }
            return res.redirect('/login?error=' + encodeURIComponent('Missing username or password'));
        }
        
        // Check if username format is valid
        if(!isValidName(username)) return res.redirect(`/login?error=` + encodeURIComponent('Invalid username, must be alphanumeric characters or underscores only'));

        // Find user by username
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        
        if (!user) {
            loginTracker.recordAttempt(ipAddress, username, false);
            return res.redirect('/login?error=' + encodeURIComponent('User not found'));
        }
        
        // Compare entered password with stored hash
        const passwordMatch = await comparePassword(password, user.password);
        
        if (!passwordMatch) {
            loginTracker.recordAttempt(ipAddress, username, false);
            return res.redirect('/login?error=' + encodeURIComponent('Invalid password'));
        }
        // Successful login
        loginTracker.recordAttempt(ipAddress, username, true);
        db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?')
        .run(user.id);
        
        // Create session
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.display_name = user.display_name;
        req.session.isLoggedIn = true;
        req.session.name_color = user.name_color;
        
        // Redirect to success page
        res.redirect(`/`);
        
    } catch (error) {
        const errMessage = 'Login error:' + error;
        return res.redirect('/login?error=' + encodeURIComponent(errMessage));
    }
});

// Render Register page
router.get('/register', (req, res) => {
    res.render('register', {
        error: req.query.error
    });
});

// Handle register form submission
router.post('/register', async (req, res) => {
    //const username = req.body.username;
    try {
        req.body.email = req.body.email.toLowerCase();
        const { username, password, email, display } = req.body;
        
        // Check for missing fields
        if (!username || !password || !email || !display) {
            return res.redirect('/register?error=' + encodeURIComponent('Missing one or more input fields'));
        }

        // Check if username format is valid
        if(!isValidName(username)) return res.redirect(`/register?error=` + encodeURIComponent('Invalid username, must be alphanumeric characters or underscores only'));
        
        //Check if email format is valid
        //https://www.geeksforgeeks.org/javascript/javascript-program-to-validate-an-email-address/
        const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!pattern.test(email)) {
            return res.redirect('/register?error=' + encodeURIComponent('Invalid email format'));
        }

        // Check if display name format is valid
        if(!isValidName(display)) return res.redirect(`/register?error=` + encodeURIComponent('Invalid display name, must be alphanumeric characters or underscores only'));

        // Validate password requirements
        const validation = validatePassword(password);
        if (!validation.valid) {
            const errMessage = validation.errors.join(', ');
            return res.redirect('/register?error=' + encodeURIComponent(errMessage));
        }
        
        // Check if username already exists
        const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
        if (existingUser) {
            return res.redirect('/register?error=' + encodeURIComponent('Username already in use'));
        }
        
        // Check if email already exists
        const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
        if (existingEmail) {
            return res.redirect('/register?error=' + encodeURIComponent('Email already in use'));
        }
    
        // Check if display name already exists
        const existingDisplay = db.prepare('SELECT id FROM users WHERE display_name = ?').get(display);
        if (existingDisplay) {
            return res.redirect('/register?error=' + encodeURIComponent('Display name already in use'));
        }
        
        // Hash the password before storing
        const passwordHash = await hashPassword(password);
        
        // Insert new user into database
        db.prepare('INSERT INTO users (username, password, email, display_name) VALUES (?, ?, ?, ?)').run(username, passwordHash, email, display);
        
        // Redirect to login page
        res.redirect(`/login`);        
    } catch (error) {
        const errMessage = 'Registration error:' + error;
        return res.redirect('/register?error=' + encodeURIComponent(errMessage));
    }
});

// Logout user and destroy the session
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ error: 'Error logging out' });
        }
        res.render('home', { user: req.session, message: 'Logged out successfully' });
    });
});

// Open profile page if logged in
router.get('/profile', requireAuth, (req, res) => {
    res.render('profile', {user: req.session});
});

module.exports = router;