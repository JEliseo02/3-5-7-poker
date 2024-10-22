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
const User = require('./src/models/user');

const { router:authRouter } = require('./src/routes/auth');
const { router: gameRouter, handleSocketConnection } = require('./src/routes/game');
const pageRouter = require('./src/routes/pages');


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


// Routes to be implemented 

//use / routes for basic GET requests, home, login, register, logout, rules
app.use('/', pageRouter);

// Use auth routes for POST requests, login and register POST requests
app.use('/auth', authRouter);

// Use game routes, direct user towards the play and join routes as well as establish a Socket.IO connection
app.use('/game', gameRouter);


// Set up Socket.IO
handleSocketConnection(io);





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


