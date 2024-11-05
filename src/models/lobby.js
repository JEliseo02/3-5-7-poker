const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const lobbySchema = new Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        length: 4
    },

    urlId: {
        type: String,
        required: true,
        unique: true
    },
    
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 12 * 60 * 60 * 1000) //12 hours from creation
    },


    name: {
        type: String,
        required: true,
        trim: true
    },
    hostId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    status: {
        type: String,
        enum: ['waiting', 'completed', 'in-progress', 'abandoned'],
        default: 'waiting'
    },

    lastActivity: {
        type: Date,
        default: Date.now()
    },

    privateStatus:{ 
        type: Boolean,
        default: false
    },


    players: [{
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        status: {
            type: String,
            enum: ['waiting', 'ready'],
            default: 'waiting'
        },
        joinedAt: {
            type: Date,
            default: Date.now
        }
    }],

    gameSettings: {
        maxPlayers: {
            type: Number,
            default: 6
        },
        hasBanker: {
            type: Boolean,
            default: false
        },
        bankerId: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        }
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
});


//Method to add host validation
lobbySchema.methods.isHost = function(userId) {
    return this.hostId.equals(userId);
};


//Index to automatically expire documents
lobbySchema.index({expiresAt: 1}, {expiresAfterSeconds: 0});


//Method to generate a 4 digit unique code 
lobbySchema.statics.generateUniqueCode = async function() {
    while (true) {
        //generate random 4-digit number
        const code = Math.floor(1000 + Math.random() * 9000).toString();

        //check if code already exists
        const exists = await this.findOne({
            code: code,
            expiresAt: { $gt: new Date()}
        });
        if (!exists) return code;
    }
};

//Method to generate a URL-safe ID
lobbySchema.statics.generateUrlId = async function () {
    while (true) {
        const characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_';
        let urlId = '';
        for (let i = 0; i < 16; i ++) {
            urlId += characters.charAt(Math.floor(Math.random() * characters.length));
        }

        //check if ID exists
        const exists = await this.findOne({ urlId });
        if (!exists) return urlId;
    }
};


//Method to check if code is valid
lobbySchema.statics.isCodeValid = async function(code) {
    const lobby = await this.findOne({
        code: code,
        expiresAt: { $gt: new Date()},
        status: {$ne: 'completed'}
    });
    return !!lobby;
};


//Method to cleanup expired lobbies
// Enhance the cleanUpExpiredLobbies method
lobbySchema.statics.cleanUpExpiredLobbies = async function() {
    const result = await this.updateMany(
        {
            $or: [
                { expiresAt: { $lte: new Date() } },
                { 
                    status: 'abandoned',
                    lastActivity: { $lte: new Date(Date.now() - 60 * 60 * 1000) } // 1 hour grace period
                },
                {
                    players: { $size: 0 },
                    lastActivity: { $lte: new Date(Date.now() - 5 * 60 * 1000) } // 5 minutes grace period
                }
            ]
        },
        {
            $set: { status: 'abandoned' }
        }
    );

    // Delete abandoned lobbies
    const deleteResult = await this.deleteMany({
        status: 'abandoned'
    });

    return {
        abandoned: result.modifiedCount,
        deleted: deleteResult.deletedCount
    };
};


//Method to check if a lobby is joinable
lobbySchema.methods.isJoinable = function() {
    return this.status === 'waiting' &&
        this.players.length < this.gameSettings.maxPlayers;
};

//Method to update activity
lobbySchema.methods.updateActivity = async function() {
    this.lastActivity = new Date();
    
    // Reset expiration if lobby is still active
    if (this.status === 'waiting' || this.status === 'in-progress'){
        this.expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
    }
    await this.save();
};


//Method to add a player to the lobby
lobbySchema.methods.addPlayer = async function(userId) {
    if (this.players.length >= this.gameSettings.maxPlayers){
        throw new Error('Lobby is full');
    }
    if (this.players.some(player => player.userId.equals(userId))) {
        throw new Error('Player already in lobby');
    }
    this.players.push({ userId });
    await this.save();
};


//Method to add validation to player count
lobbySchema.pre('save', function(next) {
    if (this.players.length > this.gameSettings.maxPlayers){
        next(new Error('Lobby cannot exceed maximum player cap'));
    }
    next();
});


//Enhanced removePlayer method with logging
lobbySchema.methods.removePlayer = async function(userId) {
    console.log('Removing player with userId:', userId);
    console.log('Current players:', this.players);
    
    // Store original length to check if player was actually removed
    const originalLength = this.players.length;
    
    this.players = this.players.filter(player => !player.userId.equals(userId));
    
    console.log('Players after removal:', this.players);
    
    // Check if player was actually removed
    if (originalLength === this.players.length) {
        console.log('Player not found in lobby');
        return false;
    }

    // If host is removed and there are other players, transfer host
    if (this.hostId.equals(userId) && this.players.length > 0) {
        this.hostId = this.players[0].userId;
        console.log('Host transferred to:', this.hostId);
    }

    await this.save();
    return true;
};


//Method to transfer host
lobbySchema.methods.transferHost = async function(newHostId) {
    if(!this.players.some(player => player.userId.equals(newHostId))) {
        throw new Error('New host must be in the lobby');
    }
    this.hostId = newHostId;
    await this.save();
};   


//Method to update lobby status
lobbySchema.methods.updateLobbyStatus = async function(newStatus) {
    if (!['waiting', 'completed', 'in-progress'].includes(newStatus)) {
        throw new Error('Invalid Lobby Status!')
    }
    this.status = newStatus;
    await this.save();
};


//Method to check health
lobbySchema.methods.checkHealth = function() {
    const now = new Date();
    const inactiveTime = now - this.lastActivity;
    const timeUntilExpiry = this.expiresAt - now;

    return {
        isActive: this.status !== 'completed' && this.status !== 'in-progress',
        inactiveMinutes: Math.floor(inactiveTime / (1000 * 60)),
        expiryMinutes: Math.floor(timeUntilExpiry / (1000 * 60)),
        shouldWarn: timeUntilExpiry < (60 * 60 * 1000),
        shouldCleanup: now >= this.expiresAt
    };
};


// - - - - - Entering Join Page Methods - - - - - 

// Validates players join request
lobbySchema.methods.validateJoinRequest = async function(userId, lobbyId) {
    const lobby = await this.findOne ({
        urlId: lobbyId,
        status: 'waiting',
        'players.length': { $lt: 6}
    });

    if(!lobby) {
        throw new Error('Lobby not found or full');
    }

    if(lobby.players.some(player => player.userId.equals(userId))) {
        throw new Error ('Player already in lobby');
    }

    return lobby;
};

// Adds player to lobby
lobbySchema.methods.addPlayerWithValidation = async function(userId){
    if (this.status !== 'waiting') {
        throw new Error ('Lobby is not accepting new players');
    }

    if(this.players.length >= this.gameSettings.maxPlayers) {
        throw new Error ('Lobby is full');
    }

    if (this.players.some(player => player.userId.equals(userId))) {
        throw new Error ('Player already in lobby');
    }

    this.players.push({userId});
    await this.save();
    return this;
};

// Get the available lobbies
lobbySchema.statics.getAvailableLobbies = async function() {
    console.log('Looking for available lobbies...');
    const now = new Date();
    
    try {
        // Include all necessary fields in the select
        const lobbies = await this.find({
            status: 'waiting',
            'players.0': { $exists: true },  // At least one player
            expiresAt: { $gt: now }
        })
        .populate('hostId', 'username')
        .populate('players.userId', 'username')
        .select('name code urlId players createdAt hostId status expiresAt lastActivity')  // Added missing fields
        .sort('-createdAt')
        .lean();

        console.log('Lobbies found:', lobbies);

        const availableLobbies = lobbies.filter(lobby => {
            console.log('Processing lobby:', lobby);
            return lobby.status === 'waiting' && 
                   lobby.expiresAt > now && 
                   lobby.players.length > 0;
        }).map(lobby => ({
            name: lobby.name,
            code: lobby.code,
            urlId: lobby.urlId,
            players: lobby.players,
            hostId: lobby.hostId,
            hostName: lobby.hostId.username,
            playerCount: lobby.players.length,
            expiresAt: lobby.expiresAt
        }));

        console.log('Available lobbies:', availableLobbies);
        return availableLobbies;

    } catch (error) {
        console.error('Error in getAvailableLobbies:', error);
        throw error;
    }
};

// Find lobby by 4 digit code
lobbySchema.statics.findByCode = async function (code) {  // Add code parameter
    console.log('Searching for lobby with code:', code);
    const lobby = await this.findOne({
        code: code,
        status: 'waiting',
        expiresAt: { $gt: new Date() }
    }).populate('hostId', 'username');

    console.log('Found lobby:', lobby);
    return lobby;
};

lobbySchema.methods.checkAndAbandonIfEmpty = async function () {
    //check if lobby is empty by player length
    if (this.players.length === 0 ) {
        console.log(`Lobby ${this.name} (${this.code}) is empty, marking as abandoned`);
        this.status = 'abandoned';
        await this.save();
        return true
    }
    return false;
};



const Lobby = mongoose.model('Lobby', lobbySchema);
module.exports = Lobby;