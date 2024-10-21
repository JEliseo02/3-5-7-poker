//Importing dependencies 
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io'); 
const path = require('path');
const session = require('express-session');
const flash = require('connect-flash');
const bcrypt = require('bcrypt');
const { isAuthenticated, isNotAuthenticated } = require (path.join(__dirname, 'src', 'middleware', 'auth'));
const User = require('./src/models/user');


//Load environment variables, ensuring sensative data will be kept out of the url
dotenv.config();


//Creating the express app
const app = express();


//Creating the http server and the Socket.io instance
const server = http.createServer(app);
const io = socketIo(server);


//Setting up the EJS view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


//Middelware Config
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(express.static(path.join(__dirname, 'public')));
app.use(session ({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {secure: process.env.NODE_ENV === 'production'}
}));
app.use(flash());



//Setting up connection to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("Succesfully connected to MongoDB!"))
.catch((err) => console.error("MongoDB connection error: ", err));


// Global middelware to make session data available in all EJS templates
app.use((req, res, next) => {
    res.locals.session = req.session;
    next();
});


//Routes to be implemented 

// - - - - - Home Route - - - - - |
app.get('/', (req,res) => {
    res.render('pages/home', {title: 'Welcome to 3-5-7 Poker'});
});
// - - - - - END OF HOME - - - - - 


// - - - - - Rules Route - - - - - |
app.get('/rules', (req,res) => {
    res.render('pages/rules', {title: 'Rules'});
})


// | - - - - - Login Route - - - - - |

//Displaying the login page (GET request)
app.get('/login', isNotAuthenticated, (req,res) => {
    res.render('pages/login', {
        title: 'Login',
        messages: req.flash()});
})


//Handle the login form submission (POST request)
app.post('/auth/login', async (req,res) => {
    
    try {
        const {username, password} = req.body;

        // Find the user
        const user = await User.findOne({username});
        if (!user){
            req.flash('error', 'Invalid username or password');
            return res.redirect('/login');
        }

        //Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword){
            req.flash('error', 'Invalid username or password');
            return res.redirect('/login');
        }

        // Set user session
        req.session.userId = user._id;
        req.session.username = user.username;

        res.redirect('/');
    } catch (error) {
        console.error('Login error', error);
        req.flash('error', 'Login failed');
        res.redirect('/login')
    }
});

// | - - - - - END OF LOGIN - - - - - |



// | - - - - - Register Route - - - - - |

//Displaying the register page (GET request)
app.get('/register', isNotAuthenticated, (req,res) => {
    res.render('pages/register', {
        title: 'Register',
        messages: req.flash()});
})

//Handle the registr form submission (POST request)
app.post('/auth/register',  async (req,res) => {
    try {
        const { username, password, confirmPassword } = req.body;

        // Validate Input
        if(!username || !password || !confirmPassword) {
            req.flash('error', 'All fields are required');
            return res.redirect('/register');
        }

        if (password !== confirmPassword) {
            req.flash('error', 'Passwords do not match');
            return res.redirect('/register');
        }

        // Check if user already exists
        const existingUser = await User.findOne({username});
        if(existingUser) {
            req.flash('error', 'Username already exists');
            return res.redirect('/register');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password,10);

        // Create new user
        const user = new User({
            username,
            password: hashedPassword
        });
        
        await user.save();

        req.flash('success','Registration successful. Please login');
        res.redirect('/login');
    } catch (error) {
        console.error('Registration error:', error);
        req.flash('error', 'Registration failed');
        res.redirect('/register');
    }
});

// | - - - - - END OF REGISTER - - - - - |


// | - - - - - Logout Route - - - - - |
app.get('/logout', isAuthenticated, (req, res) => {
    req.flash('success', 'You have logged out successfully');
    req.session.destroy(() => {
        res.redirect('/login');
    })
});




// | - - - - - Play Route - - - - - |

app.get('/play', isAuthenticated, (req,res) => {
    res.render('pages/game', {title: 'Play Game'});
})


// | - - - - - END OF PLAY - - - - - |



// | - - - - - Join Route - - - - - | 

app.get('/join', isAuthenticated, (req,res) => {
    res.render('pages/join', {title: 'Join Game'});
})







//Socket.IO connection handling 
io.on('connection', (socket) => {
    console.log('New Client Connected!');

    //Handles when a player joins
    socket.on('PlayerJoin', (playerData) => {
        //TODO: Implement Player Join Logic
        console.log('Player Joined: ', playerData);
        //Broadcast to other players or update game state
    });

    //Handles a disconnect
    socket.on('disconnect', () => {
        console.log('Client Disconnected');
        //TODO: Handle player disconnect logic
    });
});


// Error Handling Middelware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).render('pages/error', {
        title: 'Error',
        messages: 'Something went wrong :('
    });
});



//Starting the Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server is running on Port: ${PORT}`));


