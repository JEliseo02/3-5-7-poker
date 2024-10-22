// src/routes/pages.js

const express = require('express');
const router = express.Router();
const { isAuthenticated, isNotAuthenticated } = require('../middleware/auth');

// For the rule display page
const rules = [
    {
        title: "Round Structure",
        details: [
            "Players start with 3 cards (3s are wild), Round 1",
            "Then get 2 more cards (5s are wild), Round 2",
            "Finally get 2 more cards (7s are wild), Round 3",
            "Turns will rotate in a clock-wise motion around the table",
            "After each round the starting player will change counter-clockwise" 
        ]
    },
    {
        title: "Starting the Game",
        details: [
            "Each player puts in a pre-set ante before playing",
            "Example: If ante is $0.25, everyone puts this in to start",
            "Once each player has put in their ante, they will recieve 3 cards"
        ]
    },
    {
        title: "Playing Options",
        details: [
            "Play against another player: Player vs Player",
            "Play against the dealer: Player vs Dealer",
            "Choose not to play: When No Player Plays, Non-Playing Participants",
            "Fold: Folding",
            "Leave Table: Privileges"
        ]
    },
    {
        title: "Player vs Player",
        details: [
            "If two players want to play with their current hand, they swap hands",
            "Whoever has the better hand will win",
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
            "Player vs Dealer, Player wins: If player wins, they take the pot, game ends",
            "Player vs Dealer, Player losses: If dealer wins, player must match the pot, deck is reshuffled and game continues",
            "Player vs Dealer, Player & Dealer tie: Pot will remain the same and each player will recieve a new three card hand"
        ]
    },
    {
        title: "When No Player Plays",
        details: [
            "All players must reveal their cards",
            "Players with the best hand out of all players must match the pot",
            "Deck is reshuffled for new round and every player recieves a new three card hand",
            "Players don't need an additional ante for the next round"
        ]
    },
    {
        title: "Non-Playing Participants",
        details: [
            "Players who do not play in the round will put in another ante to reveal the next round",
            "Exception: When no one plays all players reveal their hands: When no Player Plays"
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
    },
    {
        title: "Cards",
        details: [
            "Round 1: Best possible hand would be three 3 cards (Ace three of a kind)",
            "Round 2: Best possible hand would be four 5 cards with either a 10, Jack, Queen, King, Ace (Royal Flush)",
            "Round 3: Best possible hand would be four 7 cards with either a 10, Jack, Queen, King, Ace, and a pair of cards (Royal Flush with Two Pair)",
            "Tie Determination: In a case where players come to a tie, the other remaining cards will determine the winner. On round 7 if players were to tie with a hand of seven cards their last two remaining cards will determine the winner",
            "Tie Determination: In a case where players have the exact same hand and no other cards to determine the winner the pot will be split evenly and the game will end",
            "Example 1: Round 7, player one has 7 7 Ace Ace 6 8 8, player two has 7 7 Ace Ace 4 King Queen. Player one wins as they have a four of a kind ace's with an eight double pair",
            "Example 2: Round 5: player one has 5 5 2 King King, player two has 5 5 2 King King. Both players have King four of a kind whith a 2, if pot is $20, player 1 and player 2 will recieve $10"
        ]
    },
    {
        title: "Folding",
        details: [
            "A player will have the option to fold when it is their turn",
            "If a player is to fold midgame they cannot pay another ante to get new cards, they are out of that game",
            "If a player is to fold they will not join back until the next game which is when: Player vs Dealer, Player wins",
        ]
    },
    {
        title: "Privileges",
        details: [
            "The Host may end a game in whatever state the game is currently in",
            "The Hosy may kick players from the lobby, host cannot kick players during active game",
            "The Host may select a banker at the beginning of the round",
            "The Host may pause the round where the current game will freeze until unfrozen",
            "The Host may split the pot at the beginning of a new game: Big Pot",
            "Player selected as banker can chose not to be the banker in which another player can be selected or there will be no banker",
            "All Players can buy back in if they choose: Buy-Ins",
            "Players can vote to split to pot and keep playing: Big Pot",
            "Leaving Table: Players can set their status to Away in order to skip a game or be away for multiple games",
            "Mid-round if a player decided to go Away they will automatically fold their hand",
            "The Banker will see all player statuses",
            "At the end of the game all players can view a log in which every action during a game is logged"
        ]
    },
    {
        title: "Big Pot",
        details: [
            "If the pot rises to be an unreasonable amount players can vote to split the pot and keep playing with the remaining amount",
            "Example: If there is a pot of $15 with four players, the players can vote to split the pot in whichever way they like",
            "Players could vote to split the pot by $1, meaning each player is to recieve a $1 out of the pot, leaving the pot with $11",
            "If majority of the players vote to split the pot the host is required to split the pot",
            "The Host can split the pot only at the beginning of a new game in order to avoid confusion"
        ]
    },
    {
        title: "Buy-Ins",
        details: [
            "A player can choose to buy back into an active game",
            "Player cannot rejoin with a buy-in until the start of a new three card round or a new game",
            "Player can only join a three card round if they played in the same game, cannot join a game they have not participated in"
        ]
    },
    {
        title: "Continuation and End",
        details: [
            "The game will end if the Player beats the Dealer: Player vs Dealer",
            "The game will end if the Host decides to end the game",
            "The game will end if two players play and have the exact same hand, as long as no other players play",
            "The game will continue if no player plays: When No Player Plays",
            "The game will continue if players play past round 3 (seven card round), round 4 will begin in which each player will recieve a new three card hand and the deck will be reshuffled",
            "The game will continue if the dealer beats the player in which only one player plays: When No Player Plays",
            "The game will continue if one player plays against the dealer and ties, the pot will remain the same and every active player will recieve a new three card hand"

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