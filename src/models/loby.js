const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const lobbySchema = new Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        length: 4
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
        enum: ['waiting', 'completed', 'in-progress'],
        default: 'waiting'
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
            default: 7
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
lobbySchema.statics.cleanUpExpiredLobbies = async function() {
    return await this.deleteMany({
        expiresAt: {$lte: new Date()}
    });
};


//Method to check if a lobby is joinable
lobbySchema.methods.isJoinable = function() {
    return this.status === 'waiting' &&
        this.players.length < this.gameSettings.maxPlayers;
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


//Method to remove a player from the lobby
lobbySchema.methods.removePlayer = async function(userId) {
    this.players = this.players.filter(player => !player.userId.equals(userId));
    await this.save();
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



const Lobby = mongoose.model('Lobby', lobbySchema);
module.exports = Lobby;