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

    // Render Login page (POST requests handled by /api/auth)
    router.get('/login', (req, res) => {
        res.render('login');
    });

    // Render Register page
    router.get('/register', (req, res) => {
        res.render('register');
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

    // 404 handler (must be last)
    router.use((req, res) => {
        res.status(404).send('<h1>404 - Page Not Found</h1>');
    });

    return router;
};
