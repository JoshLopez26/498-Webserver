// Handle profile data changes and customization

const express = require('express');
const router = express.Router();

const db = require('../database');
const { validatePassword, hashPassword, comparePassword } = require('./password-utils')
const { requireAuth } = require('./auth-middleware');

// Render change password page
router.get('/change-password', requireAuth, (req, res) => {
    res.render('change-setting', { name: 'Password', id: 'password', hide: true, user: req.session });
});

// Change user password if input is valid, then log them out
router.post('/change-password', requireAuth, async (req, res) => {
    const { old_password, new_password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

    // Setup variables for settings page
    let settings = { name: 'Password', id: 'password', hide: true, user: req.session };

    // Check for empty fields
    if  (!old_password || !new_password) {
        settings.error = 'Missing old or new password';
        return res.render('change-setting', settings);
    }
    
    // Check if new and old passwords match
    if (old_password === new_password) {
        settings.error = 'New password must be different from old password';
        return res.render('change-setting', settings);
    }

    // Check if old password is correct
    const oldPasswordMatch = await comparePassword(old_password, user.password);
    if (!oldPasswordMatch) {
        settings.error = 'Old password is incorrect';
        return res.render('change-setting', settings);
    }

    // Validate password requirements
    const validation = validatePassword(new_password);
    if (!validation.valid) {
        settings.error = validation.errors.join(', ');
        return res.render('change-setting', settings);
    }

    const passwordHash = await hashPassword(new_password);
        
    // Update password in database
    db.prepare('UPDATE users SET password = ? WHERE id = ?').run(passwordHash, req.session.userId);
    
    // Logout user and destroy session
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            return res.status(500).json({ error: 'Error logging out' });
        }
        res.redirect(`/login`);
    });
});

// Render change email page
router.get('/change-email', requireAuth, (req, res) => {
    res.render('change-setting', { name: 'Email', id: 'email', hide: false, auth: true, user: req.session });
});

// Change email if input is valid
router.post('/change-email', requireAuth, async (req, res) => {
    req.body.new_email = req.body.new_email.toLowerCase();
    req.body.old_email = req.body.old_email.toLowerCase();
    const { old_email, new_email, auth_password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

    // Setup variables for settings page
    let settings = { name: 'Email', id: 'email', hide: false, auth: true, user: req.session };

    // Check for empty fields
    if  (!old_email || !new_email || !auth_password) {
        settings.error = 'Missing one or more fields';
        return res.render('change-setting', settings);
    }

    // Check if password given is correct
    const oldPasswordMatch = await comparePassword(auth_password, user.password);
    if (!oldPasswordMatch) {
        settings.error = 'Password is incorrect';
        return res.render('change-setting', settings);
    }

    // Check if the old email input matches email in the database
    if (old_email !== user.email) {
        settings.error = 'Old email does not match current email';
        return res.render('change-setting', settings);
    }

    // Check if old and new email are the same
    if (old_email === new_email) {
        settings.error = 'New email must be different from old email';
        return res.render('change-setting', settings);
    }

    // Check if the new email is already in use
    const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(new_email);
    if (existingEmail) {
        settings.error = 'Email already in use';
        return res.render('change-setting', settings);
    }

    // Check if the email is a valid email format
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

// Render change display name page
router.get('/change-display', requireAuth, (req, res) => {
    res.render('change-setting', { name: 'Display Name', id: 'display', hide: false, user: req.session });
});

// Change display name if input is valid
router.post('/change-display', requireAuth, async (req, res) => {
    const { old_display, new_display } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);

    // Setup variables for settings page
    let settings = { name: 'Display Name', id: 'display', hide: false, user: req.session };

    // Check for empty fields
    if  (!old_display || !new_display) {
        settings.error = 'Missing old or new display name';
        return res.render('change-setting', settings);
    }

    // Check if old display name matches current name
    if (old_display !== user.display_name) {
        settings.error = 'Old display name does not match current display name';
        return res.render('change-setting', settings);
    }

    // Check if old and new display name are equal
    if (old_display === new_display) {
        settings.error = 'New display name must be different from old display name';
        return res.render('change-setting', settings);
    }

    // Check if display name is already in use
    const existingDisplay = db.prepare('SELECT id FROM users WHERE display_name = ?').get(new_display);
    if (existingDisplay) {
        settings.error = 'Display name already in use';
        return res.render('change-setting', settings);
    }

    // Check if display name is valid format
    const pattern = /^[A-Za-z0-9_]+$/;
    if (!pattern.test(new_display)) {
        settings.error = 'Invalid display name, must be alphanumeric characters or underscores only';
        return res.render('change-setting', settings);
    }
    
    // Check if display name is empty
    if (new_display.length < 0) {
        settings.error = 'Display name can\'t be empty';
        return res.render('change-setting', settings);
    }

    // Check if display name is less than 32 characters
    if (new_display.length >= 32) {
        settings.error = 'Display name must be 32 characters or less';
        return res.render('change-setting', settings);
    }

    //Display Name Successfully changed
    db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(new_display, req.session.userId);
    req.session.display_name = new_display;

    res.render('profile', {user: req.session});
});

// Change name color if given valid hex code
router.post('/change-name-color', requireAuth, (req, res) => {
    const { name_color } = req.body;
    const pattern = /^([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/; //hex code format (no #)

    // Check if valid hex code
    if (!pattern.test(name_color)) {
        return res.render('profile', {user: req.session, error: 'Invalid color format, must be a hex color code (No # symbol)' });
    }

    //Update successful
    db.prepare('UPDATE users SET name_color = ? WHERE id = ?').run(name_color, req.session.userId);
    req.session.name_color = name_color;
    res.render('profile', {user: req.session});
});

module.exports = router;