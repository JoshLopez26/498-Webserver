// The main hub for the entire webpage

const express = require('express');
const session = require('express-session');
const SQLiteStore = require('./sqlite-session-store');
const app = express();
const path = require('path');
const hbs = require('hbs');
const PORT = process.env.PORT || 3000;
const http = require('http');
const { Server } = require('socket.io');
const server = http.createServer(app);
const db = require('./database'); 


//USING METADATA FILE FORMAT (JSON) FOR PDF DETAILS

// Set view engine and views directory
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.set('modules', path.join(__dirname, 'modules'));

// Set up partials
hbs.registerPartials(path.join(__dirname, 'views/partials'));

// Middleware to parse form submits
app.use(express.urlencoded({ extended: false }));
app.use(express.static(__dirname + '/public'));

// Initialize session
const sessionStore = new SQLiteStore({
  db: path.join(__dirname, 'sessions.db'),
  table: 'sessions'
});

// Set up middleware
const middleware = (session({
  store: sessionStore,
  secret: 'Ns789ySN&*Ysb7YN*AY&NSNywn7ynd&*YDB*&E',
  resave: false,
  saveUninitialized: false
}));

// Set up socket.io for live chat
const cors = require('cors');

const corsOptions = {
    origin: ["https://bogobit.org"],
    credentials: true
};

// For Express
app.use(cors(corsOptions));

// Socket.io implementation
// All server-side socket.io is handled in server.js for simplisity as it was extremely complicated and may break on move
// This is likely not the best practice but is was the best I could do with the time
// Client-side code is in chat.hbs in a script tag (also for time)

// For Socket.IO
const io = new Server(server, {
    cors: corsOptions
});

app.use(middleware);
// Share session with Socket.IO (official method)
io.engine.use(middleware);

// Now session is available in socket.request.session
io.on('connection', (socket) => {
    const session = socket.request.session;
    const userId = session.userId;
    const username = session.username;
    const isLoggedIn = session.isLoggedIn;
    
    console.log('Client connected:', socket.id);
    console.log('User:', username, 'ID:', userId);
    
    // Authentication check
    if (!isLoggedIn) {
        socket.emit('error', { message: 'Authentication required' });
        socket.disconnect();
        return;
    }
    
    // Listen for chat message from client then insert into database
    // Afterwards, update all users chat with a io.emit to each client
    socket.on('getNewChatMessage', (data) => {
        console.log('New chat message received:', data);
        
        // Check if user exists and is logged in
        if(data.user && data.isLoggedIn)
        {
            // Insert the new message into database
            const insert = db.prepare(`
                INSERT INTO messages (user_id, text) VALUES (?, ?)
            `);
            const insertResult = insert.run(data.user, data.message);

            // Get the newly inserted message for html styling
            const select = db.prepare(`
                SELECT 
                    m.id,
                    m.text,
                    m.created_at,
                    u.display_name,
                    u.name_color
                FROM messages AS m
                JOIN users AS u ON m.user_id = u.id
                WHERE m.id = ?
            `);
            const message = select.get(insertResult.lastInsertRowid);

            if (!message) {
                console.error("Failed to retrieve message after insert");
                return;
            }

            //Send new message to all clients
            io.emit('newChatMessage', {
                id: message.id,
                text: message.text,
                created_at: message.created_at,
                display_name: message.display_name,
                name_color: message.name_color
            });
        }
        else 
        {
            console.error("Can't submit empty comment or user not logged in.")
        }
    });

    socket.on('requestData', (data) => {
        socket.emit('response', {
            success: true,
            message: `Hello ${username}!`,
            userId: userId,
            data: data
        });
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});


// Handle routes through router module
const router = require('./modules/router')();
app.use('/', router);

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});