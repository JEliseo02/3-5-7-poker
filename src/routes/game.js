// src/routes/game.js
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const Lobby = require('../models/lobby')

// Socket.IO connection handler
const handleSocketConnection = (io) => {

    const lobbyConnections = new Map(); // Using Map to store lobby connections data

    //Handle joining a lobby
    io.on('connection', (socket) => {
        console.log('New Client Connected! Socket ID: ', socket.id);

        socket.on('joinLobby', async (data) => {
            const {lobbyId, username, userId} = data;
            console.log(`Socket ${socket.id} joining lobby: ${lobbyId}`);
            console.log('Join lobby data: ', {lobbyId, username, userId});

            //Emit the player list to all clients in the lobby
            try {

                let lobby = await Lobby.findOne({urlId: lobbyId})
                    .populate({
                        path: 'players.userId',
                        select: 'username' 
                    })
                    .populate('hostId')
                console.log('Initial lobby players: ', lobby.players);

                //Check to make sure plater isn't aleady in the lobby
                if(!lobby.players.some(player => player.userId.equals(userId))) {
                    await lobby.addPlayer(userId);

                    //Refresh lobby data after adding player
                    lobby = await Lobby.findOne({urlId: lobbyId})
                        .populate({
                            path: 'players.userId',
                            select: 'username'
                        })
                        .populate('hostId');
                    console.log('Updated lobby players: ', lobby.players)
                }

                //Joining the Socket.IO room for this lobby
                socket.join(lobbyId);

                //Tracking connection for the lobby
                if (!lobbyConnections.has(lobbyId)) {
                    lobbyConnections.set(lobbyId, new Set());
                }

                //Add socket.id to connections
                lobbyConnections.get(lobbyId).add(socket.id);

                // Add debugging log to see what we're emitting
                const playerData = lobby.players.map(player => ({
                    username: player.userId.username,
                    isHost: player.userId.equals(lobby.hostId)
                }));
                console.log('Emitting player data:', playerData);

            
                //Emit the current player list with refreshed data
                io.to(lobbyId).emit('updatePlayerList', {
                    players: lobby.players.map(player => ({
                        username: player.userId.username,
                        isHost: player.userId.equals(lobby.hostId)
                    }))
                });

                //Emit the current number of connections to all clients in lobby
                const connectionCount = lobbyConnections.get(lobbyId).size;
                io.to(lobbyId).emit('connectionUpdate', {
                    count: connectionCount
                });
    
            } catch (error) {
                console.error('Error updating player list: ', error);
            }
        });

        socket.on('disconnect', () => {
            console.log('Client Disconnected, socketId: ', socket.id);

            lobbyConnections.forEach((connections, lobbyId) => {
                if (connections.has(socket.id)) {
                    connections.delete(socket.id);
                    io.to(lobbyId).emit('connectionUpdate', {
                        count: connections.size
                    });
                }
            });
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