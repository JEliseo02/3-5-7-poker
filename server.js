//Importing dependencies 
const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io'); 
const path = require('path');


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


//Setting up connection to MongoDB
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log("Succesfully connected to MongoDB!"))
.catch((err) => console.error("MongoDB connection error: ", err));


//Routes to be implemented 


// - - - - - Home Route - - - - - |
app.get('/', (req,res) => {
    res.render('pages/home', {title: 'Welcome to 3-5-7 Poker'});
});


// - - - - - END OF HOME - - - - - 



// | - - - - - Login Route - - - - - |

//Displaying the login page (GET request)
app.get('/login', (req,res) => {
    res.render('pages/login', {title: 'Login'});
})

//Handle the login form submission (POST request)
app.post('/auth/login', (req,res) => {
    const { username, password } = req.body;
})

// | - - - - - END OF LOGIN - - - - - |


// | - - - - - Register Route - - - - - |

//Displaying the register page (GET request)
app.get('/register', (req,res) => {
    res.render('pages/register', {title: 'Register'});
})

//Handle the registr form submission (POST request)
app.post('/auth/register', (req,res) => {
    const {username, password, confirmPassword} = req.body;
})


// | - - - - - END OF REGISTER - - - - - |


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


//Starting the Server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server is running on Port: ${PORT}`));


