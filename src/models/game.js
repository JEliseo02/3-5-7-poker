const mongoose = require('mongoose');
const Schema = mongoose.Schema;


const gameSchema = new Schema ({
    hostId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },

    //Basic Game Settings
    hasBanker: {
        type: Boolean,
        default: false
    },

    bankerId: {
        type: Schema.Types.ObjectId,
        ref: 'User'
        //Optional - Only if hasBanker is true
    },

    //Tracks money for all games with or without banker
    players: [{
        userId: {
            type: Schema.Types.ObjectId,
            ref: 'User'
        },
        initialBuyIn: {
            type: Number,
            required: true
        },
        currentAmount: {
            type: Number,
            required: true
        },
        winnings: {
            type: Number,
            default: 0
            //Tracks profit win/loss throughout game
        },
        additionalBuyIns: [{
            amount: Number,
            timestamp: {
                type: Date,
                default: Date.now
            }
        }]
    }],

    bankerTracking: {
        totalPoolAmount: {
            type: Number,
            default: 0
        },
        transctions: [{
            playerId: {
                type: Schema.Types.ObjectId,
                ref: 'User'
            },
            type: {
                type: String,
                enum: ['buy-in', 'cash-out', 'additional-buy-in']
            },
            amount: Number,
            timestamp: {
                type: Date,
                default: Date.now
            }
        }]
    },

    gameStatus: {
        type: String,
        enum: ['waiting', 'in-progress', 'completed'],
        default: 'waiting'
    },

    createdAt: {
        type: Date,
        default: Date.now
    },

    endedAt: {
        type: Date
    }
});

//Method to update player amounts (works with or without banker)

gameSchema.methods.updatePlayerAmount = async function(playerId, newAmount) {
    //Find the player in the players array whose userId matches the provided playersId
    //The equals() method is used instead of === becasue userId is an ObjectId
    const player = this.players.find(p => p.userId.equals(playerId));

    if (player) {
        //Calculate winnings by subtracting the initial buy in from current amount
        //Example: if buy in was 100 and current amount is 150, 150 - 100 = 50, therfore 50 is the new amount
        player.winnings = newAmount - player.initialBuyIn;

        //Updating the current players amount to their new value
        player.currentAmount = newAmount;
        
        //Save changes to the database
        //Use await becasue .save() returns a promise
        await this.save();
    }
};

//Method to get the game summary (works with or without banker)
gameSchema.methods.getGameSummary = function() {
    //Use map to create a new array containing summary data for each player
    return this.players.map(player => ({

        //Include the player's userId for reference, initial buy-in amount, current amount of money, current profit/loss, 
        userId: player.userId,
        initialBuyIn: player.initialBuyIn,
        currentAmount: player.currentAmount,
        profit: player.winnings,

        //Calculate the total money invested by adding initial buy-in and additional buy-ins
        //reduce() itereates through all additional buy-ins and sums their amounts 
        //Starting with initialBuyIn, add each buyIn.amount to the sum
        totalBuyIn: player.initialBuyIn + player.additionalBuyIns.reduce((sum, buyIn) => sum + buyIn.amount, 0)
    }));
}

const Game = mongoose.model('Game', gameSchema);
module.exports = Game;