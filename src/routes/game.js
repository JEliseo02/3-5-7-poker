const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');

const gameRouter = (app) => {
    //  - - - - - Lobby Route - - - - - 
    router.get('/lobby', isAuthenticated, (req,res) => {
        res.render('pages/lobby', {title: 'Play Game'});
    });

    //  - - - - - Join Route - - - - - 
    router.get('/join', isAuthenticated, (req,res) => {
        res.render('pages/join', {title: 'Join Game'});
    });

    // Socket.IO Handlers 
    const handleSocketConnection = (io) => {
        // Socket.IO connection handling 
        io.on('connection', (socket) => {
            console.log('New Client Connected!');

            // Handles when a player joins
            socket.on('PlayerJoin', (playerData) => {
                // TODO: Implement Player Join Logic
                console.log('Player Joined: ', playerData);
                // Broadcast to other players or update game state
            });

            // Handles a disconnect
            socket.on('disconnect', () => {
                console.log('Client Disconnected');
                // TODO: Handle player disconnect logic
            });
        });
    };

    return {
        router,
        handleSocketConnection
    };
};

module.exports = gameRouter;