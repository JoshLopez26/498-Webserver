const express = require('express');
const db = require('../database');
const argon2 = require('argon2');
const { validatePassword, hashPassword, comparePassword } = require('./password-utils')
const loginTracker = require('./login-tracker');
const { checkLoginLockout, getClientIP } = require('./auth-middleware');

module.exports = () => {
    const router = express.Router();

    router.use(express.json()); // Parse JSON bodies

    // Get user data if logged in, set as guest if else
    function getUser(req){
        let user = {  // Default Guest object
            username: "Guest",
            isLoggedIn: false,
            loginTime: null,
            visitCount: 0
        };

        if (req.session && req.session.isLoggedIn) {
            user = {
                username: req.session.username,
                isLoggedIn: true,
                loginTime: req.session.loginTime,
                visitCount: req.session.visitCount || 0
            };
            req.session.visitCount = (req.session.visitCount || 0) + 1;
        }

        return user;
    }

    // Home page
    router.get('/', (req, res) => {
        let user = getUser(req);
        res.render('home', { user: user });
    });

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
            
            console.log(`Password ${user.password}`);

            // Create session
            req.session.userId = user.id;
            req.session.username = user.username;
            req.session.display_name = user.display_name;
            req.session.isLoggedIn = true;
            
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
            const { username, password, email, display } = req.body;
            
            // Validate input
            if (!username || !password || !email || !display) {
                return res.redirect('/register?error=' + encodeURIComponent('Missing one or more input fields'));
            }
            
            // Validate password requirements
            const validation = validatePassword(password);
            if (!validation.valid) {
                const errMessage = 'Error: ' + validation.message;
                return res.redirect('/register?error=' + encodeURIComponent(errMessage));
            }
            
            // Check if username already exists
            const existingUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
            if (existingUser) {
                return res.redirect('/register?error=' + encodeURIComponent('Username already in use'));
            }

            const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
            if (existingEmail) {
                return res.redirect('/register?error=' + encodeURIComponent('Email already in use'));
            }
            
            const existingDisplay = db.prepare('SELECT id FROM users WHERE display_name = ?').get(display);
            if (existingDisplay) {
                return res.redirect('/register?error=' + encodeURIComponent('Display name already in use'));
            }
            
            // Hash the password before storing
            const passwordHash = await hashPassword(password);
            
            // Insert new user into database
            const stmt = db.prepare('INSERT INTO users (username, password, email, display_name) VALUES (?, ?, ?, ?)');
            const result = stmt.run(username, passwordHash, email, display);
            
            // Redirect to success page with username
            res.redirect(`/login`);
            //res.redirect(`/public/register-success.html?name=${encodeURIComponent(username)}&userId=${result.lastInsertRowid}`);
            
        } catch (error) {
            const errMessage = 'Registration error:' + error;
            return res.redirect('/register?error=' + encodeURIComponent(errMessage));
        }
    });

    function loadComments() {
        return db.prepare('SELECT comments.text, comments.created_at, users.display_name FROM comments JOIN users ON comments.user_id = users.id ORDER BY comments.created_at DESC').all();
    }

    // Render Comments page
    router.get('/comments', (req, res) => {
        var commentList = [];
        if(req.session && req.session.isLoggedIn){
            commentList = loadComments();
        }
        res.render('comments', {user: getUser(req), commentList});
    });

    // Handle new comment
    router.post('/comment', (req, res) => {
        const comment = req.body.comment;
        let user = getUser(req);

        if(comment && req.session && req.session.isLoggedIn)
        {
            db.prepare('INSERT INTO comments (user_id, text) VALUES (?, ?)')
            .run(req.session.userId, comment);
            console.log(`Sent comment: ${comment}`);
            const commentList = loadComments();
            res.render('comments', {user, commentList});
        }
        else
        {
            return res.send("Can't submit empty comment or user not logged in.");
        }
    });

    // Add comment form
    router.get('/comment/new', (req, res) => {
        res.render('comment/new');
    });

    //Logout user
    router.get('/logout', (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                console.error('Logout error:', err);
                return res.redirect('/public/error.html?message=' + encodeURIComponent('An error occurred while logging out.') + '&back=/');
            }
            res.redirect('/public/logged-out.html');
        });
    });

    router.post('/logout', (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                console.error('Logout error:', err);
                return res.status(500).json({ error: 'Error logging out' });
            }
            res.json({ message: 'Logged out successfully' });
        });
    });

    // Route to discover-pdf module
    const pdfRouter = require('./discover-pdf');
    router.use('/pdfs', pdfRouter);

    // Route to data testing module
    const testDb = require('./test-database');
    router.use('/test-database', testDb);

    // 404 handler (must be last)
    router.use((req, res) => {
        res.status(404).send('<h1>404 - Page Not Found</h1>');
    });

    return router;
};
