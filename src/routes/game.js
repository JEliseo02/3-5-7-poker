// src/routes/game.js
const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const Lobby = require('../models/lobby')

// Socket.IO connection handler
const handleSocketConnection = (io) => {

    const lobbyConnections = new Map(); // Using Map to store lobby connections data
    const socketToUser = new Map();

    //Handle joining a lobby
    io.on('connection', (socket) => {
        console.log('New Client Connected! Socket ID: ', socket.id);

        socket.on('joinLobby', async (data) => {

            const {lobbyId, username, userId} = data;
            console.log(`Socket ${socket.id} joining lobby: ${lobbyId}`);
            console.log('Join lobby data: ', {lobbyId, username, userId});


            //Store user info for disconnect handling
            socketToUser.set(socket.id, {userId, username, lobbyId});
            console.log('Stored socket mapping:', {socketId: socket.id, userId, username, lobbyId});



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

        // Update the disconnect handler
        socket.on('disconnect', async () => {
            console.log('Client Disconnected, socketId:', socket.id);
            
            const userInfo = socketToUser.get(socket.id);
            console.log('Disconnecting user info:', userInfo);
            
            if (userInfo) {
                const { userId, username, lobbyId } = userInfo;
                console.log(`User ${username} disconnecting from lobby ${lobbyId}`);
                
                try {
                    const lobby = await Lobby.findOne({urlId: lobbyId})
                        .populate('players.userId')
                        .populate('hostId');
        
                    if (lobby) {
                        // Remove player
                        await lobby.removePlayer(userId);
                        
                        // Check if lobby should be abandoned
                        const shouldDelete = await lobby.checkAndAbandonIfEmpty();
                        
                        if (!shouldDelete) {
                            // Only update other clients if lobby still exists
                            const updatedLobby = await Lobby.findOne({urlId: lobbyId})
                                .populate('players.userId')
                                .populate('hostId');
        
                            if (updatedLobby) {
                                const playerData = updatedLobby.players.map(player => ({
                                    username: player.userId.username,
                                    isHost: player.userId.equals(updatedLobby.hostId)
                                }));
                                
                                io.to(lobbyId).emit('updatePlayerList', {
                                    players: playerData
                                });
                            }
                        }
        
                        // Update connection count
                        if (lobbyConnections.has(lobbyId)) {
                            const connections = lobbyConnections.get(lobbyId);
                            connections.delete(socket.id);
                            io.to(lobbyId).emit('connectionUpdate', {
                                count: connections.size
                            });
        
                            // If no connections, clean up the tracking
                            if (connections.size === 0) {
                                lobbyConnections.delete(lobbyId);
                            }
                        }
                    }
                } catch (error) {
                    console.error('Error handling disconnect:', error);
                }
            }
        
            socketToUser.delete(socket.id);
        });

        socket.on('requestAvailableLobbies', async () => {
            console.log('Received request for available lobbies');
            try {
                const lobbies = await Lobby.getAvailableLobbies();
                console.log('Found lobbies to send:', lobbies);
                
                // Map the lobbies to include only necessary data
                const lobbyData = lobbies.map(lobby => ({
                    name: lobby.name,
                    code: lobby.code,
                    urlId: lobby.urlId,
                    players: lobby.players || [],
                    hostId: lobby.hostId,
                    hostName: lobby.hostId ? lobby.hostId.username : 'Unknown'
                }));
                
                console.log('Sending lobby data:', lobbyData);
                socket.emit('availableLobbies', lobbyData);
            } catch (error) {
                console.error('Error fetching lobbies:', error);
                console.error(error.stack);  // Log full error stack
            }
        });
        
        socket.on('checkLobbyCode', async (code) => {
            console.log('Checking lobby code:', code);
            try {
                const lobby = await Lobby.findByCode(code);
                console.log('Found lobby for code:', code, lobby);
                
                if (lobby) {
                    console.log('Valid code, emitting urlId:', lobby.urlId);
                    socket.emit('validCode', { urlId: lobby.urlId });
                } else {
                    console.log('Invalid code, no lobby found');
                    socket.emit('invalidCode');
                }
            } catch (error) {
                console.error('Error checking lobby code:', error);
                socket.emit('invalidCode');
            }
        });

        socket.on('togglePrivate', async (data) => {
            const {lobbyId, userId} = data;
            try{
                const lobby = await Lobby.findOne({urlId: lobbyId});
                if (lobby && lobby.hostId.equals(userId)) { // Only host can toggle this optiob
                    const newStatus = await lobby.togglePrivateStatus();

                    // Broadcasting the new status to all players in the lobby
                    io.to(lobbyId).emit('privacyStatusChanged', {
                        isPrivate: newStatus
                    })

                    // Update available lobbies
                    const availableLobbies = await Lobby.getAvailableLobbies();
                    io.emit('availableLobbies', availableLobbies);
                }
            } catch (error) {
                console.error('Error toggling private status!', error);
            }
        })

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
            players: [{ userId: req.session.userId}], //Adding host as the first player
            status: 'waiting',
            privateStatus: false,
            expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000)
        });

        await lobby.save();
        console.log('Created a lobby:', lobby);

        //redirect to actual lobby page
        res.redirect(`/game/lobby/${lobby.urlId}`);

    } catch (error) {
        console.error('Lobby Creation Error', error);
        req.flash('error', 'Failed to create lobby');
        res.redirect('/game/lobby');
    }
});

// Add this temporary route to test lobby queries
router.get('/test-lobbies', async (req, res) => {
    try {
        // Get all lobbies without any filtering
        const allLobbies = await Lobby.find({});
        console.log('All lobbies:', allLobbies);

        // Get available lobbies
        const availableLobbies = await Lobby.getAvailableLobbies();
        console.log('Available lobbies:', availableLobbies);

        res.json({
            allLobbies,
            availableLobbies
        });
    } catch (error) {
        console.error('Test route error:', error);
        res.status(500).json({ error: error.message });
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

router.post('/join', isAuthenticated, async (req, res) => {
    try {
        const {lobbyCode} = req.body;
        const lobby = await Lobby.findByCode(lobbyCode);

        if (!lobby) {
            req.flash('error', 'Invalid Lobby Code');
            return res.redirect('/game/join');
        }

        res.redirect(`/game/lobby/${lobby.urlId}`);
    } catch (error) {
        console.error('Error joining lobby', error);
        req.flash('error', 'Failed to join lobby');
        res.redirect('/game/join');
    }
})

module.exports = { router, handleSocketConnection };