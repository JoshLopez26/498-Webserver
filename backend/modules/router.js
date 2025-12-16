const express = require('express');
const db = require('../database');
const argon2 = require('argon2');
const { validatePassword, hashPassword, comparePassword } = require('./password-utils')
const loginTracker = require('./login-tracker');
const { requireAuth, checkLoginLockout, getClientIP } = require('./auth-middleware');
const { sendEmail } = require('./email');


module.exports = () => {
    const router = express.Router();

    router.use(express.json()); // Parse JSON bodies

    // Home page
    router.get('/', (req, res) => {
        res.render('home', { user: req.session });
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
            
            // Validate input
            if (!username || !password || !email || !display) {
                return res.redirect('/register?error=' + encodeURIComponent('Missing one or more input fields'));
            }
            
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

            const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
            if (existingEmail) {
                return res.redirect('/register?error=' + encodeURIComponent('Email already in use'));
            }
            
            //https://www.geeksforgeeks.org/javascript/javascript-program-to-validate-an-email-address/
            const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!pattern.test(email)) {
                return res.redirect('/register?error=' + encodeURIComponent('Invalid email format'));
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

    function loadComments(currentPage, PAGE_SIZE) {
        const offset = (currentPage - 1) * PAGE_SIZE;

        return db.prepare(`
        SELECT
            comments.id,
            comments.text,
            comments.created_at,
            users.display_name,
            users.name_color
        FROM comments
        JOIN users ON comments.user_id = users.id
        ORDER BY comments.created_at DESC
        LIMIT ? OFFSET ?
        `).all(PAGE_SIZE, offset);
    }

    function renderCommentsPage(req, res) {
        const PAGE_SIZE = 20;
        const currentPage = Math.max(1, parseInt(req.query.page, 10) || 1);
        const comments = loadComments(currentPage, PAGE_SIZE);
        const totalComments = db.prepare(`SELECT COUNT(*) AS total FROM comments`).get().total;
        const totalPages = Math.ceil(totalComments / PAGE_SIZE);

        let pages = {
            current: currentPage,
            prevPage: currentPage > 1 ? currentPage - 1 : null,
            nextPage: (currentPage < totalPages) ? currentPage + 1 : null,
            totalComments: totalComments,
            lastPage: totalPages
        }
        
        const index = []
        for(let i = 1; i <= 5; i++){
            if (currentPage + i > totalPages) break;
            index.push(currentPage + i);
        }
        if(index.length) pages.index = index;

        res.render('comments', {user: req.session, comments: comments, page: pages});
    }

    router.get('/profile', requireAuth, (req, res) => {
        res.render('profile', {user: req.session});
    });

    // Render Comments page
    router.get('/comments', requireAuth, (req, res) => {
        renderCommentsPage(req, res);
    });

    // Handle new comment
    router.post('/comment', requireAuth, (req, res) => {
        const comment = req.body.comment;
        db.prepare('INSERT INTO comments (user_id, text) VALUES (?, ?)').run(req.session.userId, comment);
        renderCommentsPage(req, res);
    });

    // Add comment form
    router.get('/comment/new', requireAuth, (req, res) => {
        res.render('comment/new');
    });

    router.post('/logout', (req, res) => {
        req.session.destroy((err) => {
            if (err) {
                console.error('Logout error:', err);
                return res.status(500).json({ error: 'Error logging out' });
            }
            res.render('home', { message: 'Logged out successfully' });
        });
    });
    
    router.get('/change-password', requireAuth, (req, res) => {
        res.render('change-setting', { name: 'Password', id: 'password', hide: true, user: req.session });
    });

    router.post('/change-password', requireAuth, async (req, res) => {
        const { old_password, new_password } = req.body;
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

        if  (!old_password || !new_password) {
            return res.render('change-setting', { name: 'Password', id: 'password', hide: true, user: req.session, error: 'Missing old or new password' });
        }

        if (old_password === new_password) {
            return res.render('change-setting', { name: 'Password', id: 'password', hide: true, user: req.session, error: 'New password must be different from old password' });
        }

        const oldPasswordMatch = await comparePassword(old_password, user.password);
        if (!oldPasswordMatch) {
            return res.render('change-setting', { name: 'Password', id: 'password', hide: true, user: req.session, error: 'Old password is incorrect' });
        }

        // Validate password requirements
        const validation = validatePassword(new_password);
        if (!validation.valid) {
            const errMessage = validation.errors.join(', ');
            return res.render('change-setting', { name: 'Password', id: 'password', hide: true, user: req.session, error: errMessage });
        }

        const passwordHash = await hashPassword(new_password);
            
        // Update password in database
        const stmt = db.prepare('UPDATE users SET password = ? WHERE id = ?');
        const result = stmt.run(passwordHash, req.session.userId);
        
        req.session.destroy((err) => {
            if (err) {
                console.error('Logout error:', err);
                return res.status(500).json({ error: 'Error logging out' });
            }
            res.redirect(`/login`);
        });
    });

    router.get('/change-email', requireAuth, (req, res) => {
        res.render('change-setting', { name: 'Email', id: 'email', hide: false, auth: true, user: req.session });
    });

    router.post('/change-email', requireAuth, async (req, res) => {
        req.body.new_email = req.body.new_email.toLowerCase();
        req.body.old_email = req.body.old_email.toLowerCase();
        const { old_email, new_email, auth_password } = req.body;
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

        let settings = { name: 'Email', id: 'email', hide: false, auth: true, user: req.session };
        if  (!old_email || !new_email || !auth_password) {
            settings.error = 'Missing one or more fields';
            return res.render('change-setting', settings);
        }

        const oldPasswordMatch = await comparePassword(auth_password, user.password);
        if (!oldPasswordMatch) {
            settings.error = 'Password is incorrect';
            return res.render('change-setting', settings);
        }

        if (old_email !== user.email) {
            settings.error = 'Old email does not match current email';
            return res.render('change-setting', settings);
        }

        if (old_email === new_email) {
            settings.error = 'New email must be different from old email';
            return res.render('change-setting', settings);
        }

        const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(new_email);
        if (existingEmail) {
            settings.error = 'Email already in use';
            return res.render('change-setting', settings);
        }

        //https://www.geeksforgeeks.org/javascript/javascript-program-to-validate-an-email-address/
        const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!pattern.test(new_email)) {
            settings.error = 'Invalid email format';
            return res.render('change-setting', settings);
        }
/////////////// EMAIL SYSTEM TESTING //////////////////

        /*
        const subject = 'Email Change Successful';
        const text = `Hello ${user.display_name},\n\nYour email has been successfully changed to ${new_email}.`;
        const result = await sendEmail(new_email, subject, text);
        if (result.success) {
            console.log('Email sent successfully!');
            console.log(`Message ID: ${result.messageId}`);
        } else {
            console.error('Failed to send email:', result.error);
            process.exit(1);
        }*/

        /*
        const recipient = 'bogobitgames@gmail.com';
        const subject = 'Test Email from Node.js';
        const text = 'This is a test email sent from a Node.js script!';
        
        console.log('Sending email...');
        console.log(`To: ${recipient}`);
        console.log(`Subject: ${subject}`);
        
        const result = await sendEmail(recipient, subject, text);
        
        if (result.success) {
            console.log('Email sent successfully!');
            console.log(`Message ID: ${result.messageId}`);
        } else {
            console.error('Failed to send email:', result.error);
            process.exit(1);
        }*/

        //Email Successfully changed
        db.prepare('UPDATE users SET email = ? WHERE id = ?').run(new_email, req.session.userId);

        res.render('profile', {user: req.session});
    });

    router.get('/change-display', requireAuth, (req, res) => {
        res.render('change-setting', { name: 'Display Name', id: 'display', hide: false, user: req.session });
    });

    router.post('/change-display', requireAuth, async (req, res) => {
        const { old_display, new_display } = req.body;
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
        let settings = { name: 'Display Name', id: 'display', hide: false, user: req.session };

        if  (!old_display || !new_display) {
            settings.error = 'Missing old or new display name';
            return res.render('change-setting', settings);
        }

        if (old_display !== user.display_name) {
            settings.error = 'Old display name does not match current display name';
            return res.render('change-setting', settings);
        }

        if (old_display === new_display) {
            settings.error = 'New display name must be different from old display name';
            return res.render('change-setting', settings);
        }

        const existingDisplay = db.prepare('SELECT id FROM users WHERE display_name = ?').get(new_display);
        if (existingDisplay) {
            settings.error = 'Display name already in use';
            return res.render('change-setting', settings);
        }

        const pattern = /^[A-Za-z0-9_]+$/;
        if (!pattern.test(new_display)) {
            settings.error = 'Invalid display name, must be alphanumeric characters or underscores only';
            return res.render('change-setting', settings);
        }
        
        if (new_display.length < 4 || new_display.length > 32) {
            settings.error = 'Display name too long, must be between 4 and 32 characters';
            return res.render('change-setting', settings);
        }

        //Display Name Successfully changed
        db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(new_display, req.session.userId);
        req.session.display_name = new_display;

        res.render('profile', {user: req.session});
    });

    router.post('/change-name-color', requireAuth, (req, res) => {
        const { name_color } = req.body;
        const pattern = /^([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

        if (!pattern.test(name_color)) {
            return res.render('profile', {user: req.session, error: 'Invalid color format, must be a hex color code (No # symbol)' });
        }

        //Update successful
        db.prepare('UPDATE users SET name_color = ? WHERE id = ?').run(name_color, req.session.userId);
        req.session.name_color = name_color;
        res.render('profile', {user: req.session});
    });

    router.get('/chat', requireAuth, (req, res) => {
        const messageList = db.prepare('SELECT messages.text, messages.created_at, users.display_name, users.name_color FROM messages JOIN users ON messages.user_id = users.id ORDER BY messages.created_at ASC').all();
        res.render('chat', {user: req.session, messages: messageList});
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
