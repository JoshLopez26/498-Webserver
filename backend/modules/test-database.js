const express = require('express');

const Database = require('better-sqlite3');
const path = require('path');
const router = express.Router();

// Connect to database file
const dbPath = path.join(__dirname, '..', 'app.db');
const db = new Database(dbPath);

router.get('/', (req, res) => {
    // Create tables if they don't exist
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Insert some sample data if the table is empty
    const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (userCount.count === 0) {
        console.log('Inserting sample data...');
        // Alternative way to insert multiple pieces of data compared to what was done in class (more safe too)
        const insert = db.prepare('INSERT INTO users (name, email) VALUES (?, ?)');
        insert.run('Mario', 'mario@example.com');
        insert.run('Princess Peach', 'peach@example.com');
        insert.run('Luigi', 'luigi@example.com');
        console.log('Sample data inserted!');
    }

    // Retrieve and print all users
    console.log('\n--- All Users ---');
    const users = db.prepare('SELECT * FROM users').all();
    console.log('Total users:', users.length);
    users.forEach((user) => {
        console.log(`ID: ${user.id}, Name: ${user.name}, Email: ${user.email}, Created: ${user.created_at}`);
    });

    // Retrieve and print a specific user
    console.log('\n--- User by ID ---');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(1);
    if (user) {
        console.log(`Found user: ${user.name} (${user.email})`);
    } else {
        console.log('User not found');
    }

    // Retrieve and print users by condition
    console.log('\n--- Users matching condition ---');
    // The "%" symbol acts like a wildcard
    const filteredUsers = db.prepare('SELECT * FROM users WHERE name LIKE ?').all('%Mario%');
    console.log(`Found ${filteredUsers.length} user(s) with "Mario" in their name:`);
    filteredUsers.forEach((user) => {
        console.log(`     - ${user.name} (${user.email})`);
    });

    // Close the database connection
    db.close();
    console.log('\nDatabase connection closed.');
});

module.exports = router;
