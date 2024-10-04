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
const Session = require('./models/session');

// Serve static files from the 'public' directory
app.use(express.static('public'));

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/poker_3_5_7', { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.log(err));

// Middleware
app.use(express.urlencoded({ extended: true }));

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



// Set the view engine to EJS
app.set('view engine', 'ejs');

// Function to generate a random session code (4 characters: A-Z, 0-9)
function generateSessionCode() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

// Render Pages
app.get('/rules', (req, res) => {
    res.render('rules');  // This will render rules.ejs
});

// Routes to render EJS templates
app.get('/', (req, res) => {
    res.render('home');  // This will render home.ejs
});

// Route to render Play page
app.get('/play', checkAuthenticated, (req, res) => {
    res.render('play'); // Render the play.ejs page
});

// Route to render Register page
app.get('/register', (req, res) => {
    res.render('register'); // Render register.ejs
});


// Route for registration
app.post('/register', async (req, res) => {
    const { username, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        
        // Flash success message
        req.flash('success', 'Registration successful! Please log in.');
        res.redirect('/login');
    } catch (error) {
        console.error("Registration error:", error);
        // Flash error message
        req.flash('error', 'Registration failed. Please try again.');
        res.redirect('/register');
    }
});


// Route to render Login page
app.get('/login', (req, res) => {
    res.render('login'); // Render login.ejs
});

// Handle POST request for login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ username });

    if (user && await bcrypt.compare(password, user.password)) {
        req.session.userId = user._id; // Store user ID in session
        req.session.username = user.username; // Store username in session
        req.flash('success', 'Login successful!'); // Flash success message
        res.redirect('/'); // Redirect to home or dashboard
    } else {
        req.flash('error', 'Invalid username or password'); // Flash error message
        res.redirect('/login'); // Redirect back to login
    }
});

// Route to render Logout page
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.redirect('/'); // Redirect to home if there's an error
        }
        res.redirect('/'); // Redirect to home after logout
    });
});

// Route to create a session
app.get('/create-session', checkAuthenticated, (req, res) => {
    const sessionCode = generateSessionCode();
    res.render('create-session', { sessionCode });
});

// Handle POST request to create a new session
app.post('/create-session', checkAuthenticated, async (req, res) => {
    try {
        const sessionCode = generateSessionCode();
        const newSession = new Session({
            password: sessionCode,
            host: req.session.username,
            players: []
        });

        console.log("Creating session:", newSession);
        await newSession.save();
        console.log("Session created and saved:", newSession);

        res.render('create-session', {
            sessionCode: sessionCode,
            host: req.session.username,
            players: newSession.players // This will be an empty array at the start
        });
    } catch (error) {
        console.error("Error creating session:", error);
        res.status(500).send("Error creating session");
    }
});

// Route to join a session
app.get('/join-session', checkAuthenticated, (req, res) => {
    res.render('join-session');
});

// Handle POST request for joining a session
app.post('/join-session', checkAuthenticated, async (req, res) => {
    const { password } = req.body; // Assuming the join session form sends the password
    const session = await Session.findOne({ password });

    if (session) {
        session.players.push(req.session.username); // Add the player's username to the players array
        await session.save();
        
        // Emit an event to update players in the lobby
        io.emit('playerJoined', {
            sessionId: session._id,
            players: session.players
        });

        // Redirect to the unique session URL instead of rendering the page
        res.redirect(`/session/${session.password}`); // Redirect to session page with unique URL
        console.log("You've successfully joined a session");
    } else {
        res.send('Session not found or invalid password.'); // Handle invalid session
    }
});

// Route to render the unique session page
app.get('/session/:sessionCode', checkAuthenticated, async (req, res) => {
    const session = await Session.findOne({ password: req.params.sessionCode });
    if (session) {
        res.render('create-session', {
            sessionCode: session.password,
            host: session.host,
            players: session.players // Pass the current players in the session
        });
    } else {
        res.send('Session not found.'); // Handle session not found
    }
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
