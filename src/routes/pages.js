// src/routes/pages.js

const express = require('express');
const router = express.Router();
const { isAuthenticated, isNotAuthenticated } = require('../middleware/auth');

// For the rule display page
const rules = [
    {
        title: "Round Structure",
        details: [
            "Players start with 3 cards (3s are wild)",
            "Then get 2 more cards (5s are wild)",
            "Finally get 2 more cards (7s are wild)"
        ]
    },
    {
        title: "Starting the Game",
        details: [
            "Each player puts in a pre-set ante before playing",
            "Example: If ante is $0.25, everyone puts this in to start"
        ]
    },
    {
        title: "Playing Options",
        details: [
            "Play against another player: Player vs Player",
            "Play against the dealer: Player vs Dealer",
            "Choose not to play: When No Player Plays, Non-Playing Participants",
            "Fold"
        ]
    },
    {
        title: "Player vs Player",
        details: [
            "If two players want to play with their current hand, they swap hands",
            "Winner takes the pot",
            "Loser must match the pot amount"
        ]
    },
    {
        title: "Player vs Dealer",
        details: [
            "If only one player wants to play they will go against the dealer",
            "Player reveals their hand to the table",
            "Dealer draws the same amount of cards",
            "If player wins, they take the pot, game ends",
            "If dealer wins, player must match the pot, deck is reshuffled and game continues"
        ]
    },
    {
        title: "When No Player Plays",
        details: [
            "All players must reveal their cards",
            "Players with the best hand must match the pot",
            "Deck is reshuffled for new round",
            "Players don't need an additional ante for the next round"
        ]
    },
    {
        title: "Non-Playing Participants",
        details: [
            "Players who do not play in the round will put in another $.25 to reveal the next round",
            "Exception: When no one plays all players reveal their hands"
        ]
    },
    {
        title: "Banker Option (Optional)",
        details: [
            "Host can select a banker",
            "Banker will collect total of all chips",
            "Tracks and distributes winnings/losses at the end",
            "Example: 4 players with $20 each, banker holds $80"
        ]
    },
    {
        title: "Player limit",
        details: [
            "Standard game: Maximum 6 players with one deck, 42 cards for six players, 7 cards for dealer",
            "7+ players will require an additional deck"
        ]
    }
];


// Implementing the GET routes
// - - - - - Home Route - - - - - 
router.get('/', (req,res) => {
    res.render('pages/home', {title: 'Welcome to 3-5-7 Poker'});
});
// - - - - - END OF HOME - - - - - 


//  - - - - - Login Route - - - - - 
//Displaying the login page (GET request)
router.get('/login', isNotAuthenticated, (req,res) => {
    res.render('pages/login', {
        title: 'Login',
        messages: req.flash()});
});
//  - - - - - END OF LOGIN - - - - - 


//  - - - - - Register Route - - - - - 
//Displaying the register page (GET request)
router.get('/register', isNotAuthenticated, (req,res) => {
    res.render('pages/register', {
        title: 'Register',
        messages: req.flash()});
});
//  - - - - - END OF REGISTER - - - - - 


//  - - - - - Logout Route - - - - - 
router.get('/logout', isAuthenticated, (req, res) => {
    req.flash('success', 'You have logged out successfully');
    req.session.destroy(() => {
        res.redirect('/login');
    })
});
// - - - - - END OF LOGOUT - - - - - 


// - - - - - Rules Route - - - - - 
router.get('/rules', (req,res) => {
    res.render('pages/rules', {
        title: 'Game Rules',
        rules: rules
    });
});
// - - - - - END OF RULES - - - - - 



module.exports = router;