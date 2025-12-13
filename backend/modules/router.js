const express = require('express');
const db = require('../database');
const argon2 = require('argon2');
const { validatePassword, hashPassword, comparePassword } = require('./password-utils')

module.exports = (users, comments) => {
    const router = express.Router();

    router.use(express.json()); // Parse JSON bodies

    // Get user data if logged in, set as guest if else
    function getUser(req){
        let user = {  // Default Guest object
            name: "Guest",
            isLoggedIn: false,
            loginTime: null,
            visitCount: 0
        };

        if (req.session && req.session.isLoggedIn) {
            user = {
                name: req.session.username,
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
        res.render('login');
    });

    // Handle login form submission
    router.post('/login', async (req, res) => {
        try {
            const { username, password } = req.body;
            
            // Validate input
            if (!username || !password) {
                console.error('Missing username or password');
                return res.redirect('/');
            }
            
            // Find user by username
            const user = db.prepare('SELECT * FROM users WHERE name = ?').get(username);
            
            if (!user) {
                console.error('Error: User not found');
                return res.redirect('/');
            }
            
            // Compare entered password with stored hash
            const passwordMatch = await comparePassword(password, user.password_hash);
            
            if (!passwordMatch) {
                console.error('Error: Incorect password');
                return res.redirect('/');
           }
            
            // Successful login - update last login time
            db.prepare('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?')
            .run(user.id);
            
            // Create session
            req.session.userId = user.id;
            req.session.username = user.username;
            req.session.isLoggedIn = true;
            
            // Redirect to success page
            res.redirect(`/public/login-success.html?name=${encodeURIComponent(user.username)}`);
            
        } catch (error) {
            console.error('Login error:', error);
            res.redirect('/');
        }
    });

    // Render Register page
    router.get('/register', (req, res) => {
        res.render('register');
    });

    // Handle register form submission
    router.post('/register', async (req, res) => {
        //const username = req.body.username;
        try {
            const { username, password } = req.body;
            
            // Validate input
            if (!username || !password) {
                console.error('Error: Missing username or password');
                return res.redirect('/');
            }
            
            // Validate password requirements
            const validation = validatePassword(password);
            if (!validation.valid) {
                console.error('Error: ' + validation.message);
                return res.redirect('/');
            }
            
            // Check if username already exists
            const existingUser = db.prepare('SELECT id FROM users WHERE name = ?').get(username);
            if (existingUser) {
                console.error('Error: Username already exists');
                return res.redirect('/');
            }
            
            // Hash the password before storing
            const passwordHash = await hashPassword(password);

            //TEMP EMAIL
            const tmpEmail = `temp@gmail.com`;
            
            // Insert new user into database
            const stmt = db.prepare('INSERT INTO users (name, password, email) VALUES (?, ?, ?)');
            const result = stmt.run(username, passwordHash, tmpEmail);
            
            // Redirect to success page with username
            res.redirect(`/public/register-success.html?name=${encodeURIComponent(username)}&userId=${result.lastInsertRowid}`);
            
        } catch (error) {
            console.error('Registration error:', error);
            res.redirect('/');
        }
    });

    // Render Comments page
    router.get('/comments', (req, res) => {
        let user = getUser(req);
        res.render('comments', {user, comments});
    });

    // Handle new comment
    router.post('/comment', (req, res) => {
        const comment = req.body.comment;
        let user = getUser(req);

        if (comment) {
            const commentObj = {
                author: req.session.username,
                comment: comment,
                createdAt: new Date()
            };
            comments.push(commentObj);
            console.log(`Sent comment: ${comment}`);
        } else {
            return res.send("Can't submit empty comment.");
        }

        res.render('comments', {user, comments});
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
                return res.redirect('/public/error.html?message=' + encodeURIComponent('An error occurred while logging out.') + '&back=/');
            }
            res.redirect('/public/logged-out.html');
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
