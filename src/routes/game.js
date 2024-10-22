// src/routes/game.js
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const Lobby = require('../models/lobby')

// Socket.IO connection handler
const handleSocketConnection = (io) => {
    io.on('connection', (socket) => {
        console.log('New Client Connected!');

        socket.on('PlayerJoin', (playerData) => {
            console.log('Player Joined: ', playerData);
            // TODO: Implement Player Join Logic
        });

        socket.on('disconnect', () => {
            console.log('Client Disconnected');
            // TODO: Handle player disconnect logic
        });
    });
};

//  - - - - - Lobby Route - - - - - 
router.get('/lobby', isAuthenticated, (req, res) => {
    res.render('pages/lobby', { 
        title: 'Create Lobby',
        messages: req.flash() 
    });
});

// Handle Lobby Creation
router.post('/create-lobby', isAuthenticated, async (req,res) => {
    try{
        const { lobbyName } = req.body;

        //generate unique code
        const [code, urlId] = await Promise.all ([
            Lobby.generateUniqueCode(),
            Lobby.generateUrlId()
        ])

        const lobby = new Lobby ({
            code,
            urlId,
            name: lobbyName,
            hostId: req.session.userId,
            players: [{ userId: req.session.userId}] //Adding host as the first player
        });

        await lobby.save();

        //redirect to actual lobby page
        res.redirect(`/game/lobby/${lobby.urlId}`);

    } catch (error) {
        console.error('Lobby Creation Error', error);
        req.flash('error', 'Failed to create lobby');
        res.redirect('/game/lobby');
    }
});


//Route for accessing Lobby
router.get('/lobby/:urlId', isAuthenticated, async (req, res) => {
    try {
        // Add populate to get user data
        const lobby = await Lobby.findOne({ urlId: req.params.urlId })
            .populate('players.userId')  // Populate player data
            .populate('hostId');         // Populate host data

        if (!lobby) {
            req.flash('error', 'Lobby not found');
            return res.redirect('/game/lobby');
        }

        res.render('pages/game-lobby', {
            title: lobby.name,
            lobby,
            messages: req.flash()
        });
    } catch (error) {
        console.error('Error accessing lobby:', error);
        req.flash('error', 'Failed to access lobby');
        res.redirect('/game/lobby');
    }
});




//  - - - - - Join Route - - - - - 
router.get('/join', isAuthenticated, (req, res) => {
    res.render('pages/join', { title: 'Join Game' });
});

module.exports = { router, handleSocketConnection };