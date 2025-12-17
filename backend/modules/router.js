const express = require('express');
const db = require('../database');
const { validatePassword, hashPassword, comparePassword } = require('./password-utils')
const { requireAuth } = require('./auth-middleware');
//const { sendEmail } = require('./email');

module.exports = () => {
    const router = express.Router();

    router.use(express.json()); // Parse JSON bodies

    // Home page
    router.get('/', async (req, res) => {
        // Insert some sample data if the table is empty
        const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
        if (userCount.count === 0) {
            const passwordHash = await hashPassword("#3Frfrfr");
            const insertUser = db.prepare('INSERT INTO users (username, password, email, display_name, name_color) VALUES (?, ?, ?, ?, ?)');
            insertUser.run('Bogo', passwordHash, 'bogo@example.com', 'Bit', '00FF00');
            const row = db.prepare('SELECT id FROM users WHERE username = ?').get('Bogo');
            const userId = row.id;
            const commentInsert = db.prepare('INSERT INTO comments (user_id, text) VALUES (?, ?)');
            for(let i = 0; i < 99; i++)
                commentInsert.run(userId, i.toString());
        }
        res.render('home', { user: req.session });
    });

    // Router for profile / login / register / logout
    const profileAuthHandler = require('./profile-auth-handler');
    router.use('/', profileAuthHandler);

    // Router for comments
    const commentHandler = require('./comment-handler');
    router.use('/', commentHandler);

    // Router for changing password / email / display_name / name_color
    const profileSettingsHandler = require('./profile-settings-handler');
    router.use('/', profileSettingsHandler);

    router.get('/chat', requireAuth, (req, res) => {
        const messageList = db.prepare('SELECT messages.text, messages.created_at, users.display_name, users.name_color FROM messages JOIN users ON messages.user_id = users.id ORDER BY messages.created_at ASC').all();
        res.render('chat', {user: req.session, messages: messageList});
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
