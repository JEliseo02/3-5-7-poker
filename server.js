const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIO = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = socketIO(server);
const bcrypt = require('bcrypt');
const flash = require('connect-flash');
const User = require('./models/user'); 

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/poker_3_5_7', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));


// Middleware
app.use(express.urlencoded({ extended: true }));

//Login Middleware

const session = require('express-session');

app.use(session({
    secret: 'your_secret_key', // Change this to a secure random string
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set true if using HTTPS
}));

app.use(flash());

// Make flash messages available in all views
app.use((req, res, next) => {
    res.locals.messages = req.flash(); // Make flash messages available
    next();
});


app.use((req, res, next) => {
    res.locals.session = req.session; // Make session available in all EJS templates
    next();
});

function checkAuthenticated(req, res, next) {
    if (req.session.userId) {
        return next();
    }
    res.redirect('/login'); // Redirect to login if not authenticated
}

// Route for registration
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ username, password: hashedPassword });
    await newUser.save();
});

// Route for login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });
    if (user && await bcrypt.compare(password, user.password)) {
        req.session.userId = user._id; // Store user ID in session
        req.session.username = user.username; // Store username in session
        res.send('Logged in successfully!');
    } else {
        res.send('Invalid username or password.');
    }
});


//Session Middelware 

// In-memory session store (for demonstration purposes)
const Session = require('./models/session');

// Set the view engine to EJS
app.set('view engine', 'ejs');

// Handle POST request for joining a session
app.post('/join-session', (req, res) => {
    const { sessionCode } = req.body;
    if (sessions[sessionCode]) {
        // Session exists, proceed to the game
        // You can redirect to a game page or show a success message
        res.send(`Joined session: ${sessionCode}`);
    } else {
        res.send('Session not found. Please try again.');
    }
});

// Function to generate a random session code (4 characters: A-Z, 0-9)
function generateSessionCode() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}



//Render Pages
app.get('/rules', (req, res) => {
    res.render('rules');  // This will render rules.ejs
});

// Routes to render EJS templates
app.get('/', (req, res) => {
    res.render('home');  // This will render home.ejs (or index.ejs if you rename it)
});

//Route to render Play page
app.get('/play', checkAuthenticated, (req, res) => {
    if (req.session.userId) {
        // User is logged in, redirect to the join session page
        res.redirect('/join-session');
    } else {
        // User is not logged in, redirect to login page with a message
        req.flash('error', 'Please login before playing');
        res.redirect('/login');
    }
});

//Route to render Register page
app.get('/register', (req, res) => {
    res.render('register'); // Render register.ejs
});

//Route to render Login page
app.get('/login', (req, res) => {
    res.render('login'); // Render login.ejs
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    // Find user in the database
    const user = await User.findOne({ username });

    if (user && await bcrypt.compare(password, user.password)) {
        req.session.userId = user._id; // Store user ID in session
        res.redirect('/'); // Redirect to home or dashboard
    } else {
        res.send('Invalid username or password'); // Handle login failure
    }
});

//Route to render Logout page
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/'); // Redirect to home if there's an error
        }
        res.redirect('/'); // Redirect to home after logout
    });
});

// Route to create a session
app.get('/create-session', checkAuthenticated,(req, res) => {
    const sessionCode = generateSessionCode();
    sessions[sessionCode] = {}; // Initialize an empty session
    res.render('create-session', { sessionCode });
});

app.post('/create-session', checkAuthenticated, async (req, res) => {
    const newSession = new Session({ password: generateSessionCode() });
    await newSession.save();
    res.json({ password: newSession.password }); // Send the generated password back
});


// Route to join a session
app.get('/join-session', checkAuthenticated ,(req, res) => {
    res.render('join-session');
});


// Socket.io communication setup
io.on('connection', (socket) => {
    console.log('A user connected');
    // Handle game events here
    socket.on('disconnect', () => {
        console.log('A user disconnected');
    });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
