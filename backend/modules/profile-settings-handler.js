const express = require('express');
const router = express.Router();

const db = require('../database');
const { validatePassword, hashPassword, comparePassword } = require('./password-utils')
const { requireAuth } = require('./auth-middleware');

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
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(passwordHash, req.session.userId);
    
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

module.exports = router;