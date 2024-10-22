const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const User = require('../models/user');


// Middelware to check is user is authenticated
const isAuthenticated = (req,res,next) => {
    if(req.session && req.session.userId) {
        return next();
    }

    //If user isn't authenticated, redirect to login page
    req.flash('error', 'Please log in to access this page');
    res.redirect('/login');
};


// Middelware to check if user is NOT authenticated (for login/register page)
const isNotAuthenticated = (req,res,next) => {
    if (!req.session || !req.session.userId){
        return next();
    }

    //If user is already logged in, redirect to home
    res.redirect('/');
};


// Handle POST routes
// Handle the login form submission (POST request)
router.post('/login', async (req,res) => {
    
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


//Handle the registr form submission (POST request)
router.post('/register',  async (req,res) => {
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





module.exports = {
    router,
    isAuthenticated,
    isNotAuthenticated
}