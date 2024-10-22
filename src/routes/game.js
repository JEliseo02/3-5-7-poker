// src/routes/game.js
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');

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
    res.render('pages/lobby', { title: 'Play Game' });
});

//  - - - - - Join Route - - - - - 
router.get('/join', isAuthenticated, (req, res) => {
    res.render('pages/join', { title: 'Join Game' });
});

module.exports = { router, handleSocketConnection };