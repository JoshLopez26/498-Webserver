const express = require('express');

module.exports = (users, comments) => {
    const router = express.Router();

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
    router.post('/login', (req, res) => {
        const username = req.body.username;
        const password = req.body.password;

        if (!username || !password) {
            return res.send("Username and password required.");
        }

        if (users[username] && users[username] === password) {
            req.session.isLoggedIn = true;
            req.session.username = username;
            req.session.loginTime = new Date().toISOString();
            req.session.visitCount = 0;

            console.log(`User ${username} logged in at ${req.session.loginTime}`);
            return res.redirect('/');
        } else {
            return res.send("Invalid username or password.");
        }
    });

    // Render Register page
    router.get('/register', (req, res) => {
        res.render('register');
    });

    // Handle register form submission
    router.post('/register', (req, res) => {
        const username = req.body.username;
        const password = req.body.password;

        if (!username || !password) {
            return res.send("Username and password required.");
        }

        if (users[username]) {
            return res.send("Username already exists. Please log in instead.");
        }

        users[username] = password;
        console.log(`Registered new user: ${username}`);

        req.session.isLoggedIn = true;
        req.session.username = username;
        req.session.loginTime = new Date().toISOString();
        req.session.visitCount = 0;

        res.redirect('/');
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

    // Logout user
    router.post('/logout', (req, res) => {
        if(req.session) {
            req.session.destroy((err) => {
                if (err) {
                    console.log('Error destroying session:', err);
                }
            });
        }

        res.clearCookie('name');
        res.redirect('/');
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
