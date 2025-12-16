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


const sessionStore = new SQLiteStore({
  db: path.join(__dirname, 'sessions.db'),
  table: 'sessions'
});

const middleware = (session({
  store: sessionStore,
  secret: 'Ns789ySN&*Ysb7YN*AY&NSNywn7ynd&*YDB*&E',
  resave: false,
  saveUninitialized: false
}));

const cors = require('cors');

const corsOptions = {
    origin: ["https://bogobit.org"],
    credentials: true
};

// For Express
app.use(cors(corsOptions));

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
    
    // Listen for events
    socket.on('newChatMessage', (data) => {
        console.log('New chat message received:', data);
        const chatLogEntry = document.getElementById('chat-log-entry');
        const newEntry = document.createElement('ul');
        newEntry.textContent = data.message;
        chatLogEntry.appendChild(newEntry);
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