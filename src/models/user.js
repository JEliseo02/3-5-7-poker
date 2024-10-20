const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userSchema = new Schema({

    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3
    },

    password: {
        type: String,
        required: true,
        minlength: 6
    },

    currentGameMoney: {
        type: Number,
        default: 0, // Set when joining a lobby
        validate: {
            validator: Number.isFinite,
            message: 'Invalid money amount!'
        }
    },

    gameHistory: [{
        gameId: {
            type: Schema.Types.ObjectId,
            ref: 'Game'
        },
        startingAmount: {
            type: Number,
            required: true,
        },
        endingAmount: {
            type: Number,
            required: true
        },
        profit: {
            type: Number,
            required: true,
        },
        wasBanker: {
            type: Boolean,
            required: true
        },
        playedAt: {
            type: Date,
            default: Date.now
        },
        lobbyName: {
            type: String,
            required: true
        }
    }],

    statistics: {
        totalGamesPlayed: {
            type: Number,
            default: 0
        },
        totalWinnings: {
            type: Number,
            default: 0
        },
        gamesWon: {
            type: Number,
            default: 0
        },
        timesAsBanker: {
            type: Number,
            default: 0
        },
        biggestWin: {
            type: Number,
            default: 0
        },
        biggestLoss: {
            type: Number,
            default: 0
        }
    },

    createdAt: {
        type: Date,
        default: Date.now
    },

    
});

userSchema.index({ username: 1}); // Index for fast username lookups
userSchema.index({ 'statistics.totalWinnings': -1}); // Index for sorting leaderboards


// Method to add game statistics to game history
userSchema.methods.addGameToHistory = async function(gameData){
    const profit = gameData.endingAmount - gameData.startingAmount;

    // Adding validation
    if (!gameData || !gameData.startingAmount || !gameData.endingAmount || !gameData.lobbyName) {
        throw new Error('Invalid game data provided');
    }

    this.gameHistory.push({
        gameId: gameData.gameId,
        startingAmount: gameData.startingAmount,
        endingAmount: gameData.endingAmount,
        profit: profit,
        wasBanker: gameData.wasBanker,
        lobbyName: gameData.lobbyName
    });

    // Update statistics
    this.statistics.totalGamesPlayed += 1;
    this.statistics.totalWinnings += profit;

    if (profit > 0){
        this.statistics.gamesWon += 1;
        this.statistics.biggestWin = Math.max(this.statistics.biggestWin, profit);
    } else {
        this.statistics.biggestLoss = Math.min(this.statistics.biggestLoss, profit);
    }

    if(gameData.wasBanker) {
        this.statistics.timesAsBanker += 1;
    }

    await this.save();
};

// Method to get summary of recent performance
userSchema.methods.getRecentPerformance = function (gamesCount = 5) {
    const recentGames = this.gameHistory
        .slice(-gamesCount)
        .reverse();

    const summary = {
        games: recentGames,
        totalProfit: recentGames.reduce((sum, game) => sum + game.profit, 0),
        averageProfit: recentGames.length ? 
            recentGames.reduce((sum, game) => sum + game.profit, 0) / recentGames.length : 0
    };

    return summary;
};



const User = mongoose.model('User', userSchema);
module.exports = User;