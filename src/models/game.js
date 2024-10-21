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
        transactions: [{
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



// - - - - - 1. Core setup Methods - - - - - 


// Add method to validate and update game status
gameSchema.methods.updateGameStatus = async function(newStatus){
    const validTransitions = {
        'waiting': ['in-progress'],
        'in-progress': ['completed'],
        'completed': []
    };

    // Check if transition is valid
    if (!validTransitions[this.gameStatus].includes(newStatus)) {
        throw new Error(`Invalid status transition from ${this.gameStatus} to ${newStatus}`);
    }

    // If completing game, set endedAt
    if (newStatus === 'completed') {
        this.endedAt = new Date();
    }

    this.gameStatus = newStatus;
    return this.save();
};



// Method to assign banker
gameSchema.methods.assignBanker = async function(bankerId) {
    const player = this.players.find(p => p.userId.equals(bankerId));
    if (!player) {
        throw new Error('Selected banker must be a player in the game');
    }

    this.hasBanker = true;
    this.bankerId = bankerId;

    //Initial total pool amount
    this.bankerTracking.totalPoolAmount = this.players.reduce((sum, player) => 
        sum + player.currentAmount, 0);

    return this.save();
};



// Method to validate banker options
gameSchema.methods.validateBankerOptions = function(operation) {
    if (!this.hasBanker) {
        throw new Error('No banker assigned to this game!');
    }

    //Check if banker exists and matches
    const banker = this.players.find( p => p.userId.equals(this.bankerId));
    if (!banker) {
        throw new Error('Banker not found in player list');
    }

    const totalPlayerMoney = this.players.reduce((sum, player) => 
        sum + player.currentAmount, 0);

    // Validate total money matches pool
    if (Math.abs(totalPlayerMoney - this.bankerTracking.totalPoolAmount) > 0.01 ) {
        throw new Error('Pool amount mismatch detected!');
    }

    return true;
};



// - - - - - 2. Player Management Options - - - - - 


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



// Method to handle additional buy-ins
gameSchema.methods.addBuyIn = async function(playerId, amount) {
    if(!Number.isFinite(amount) || amount <= 0) {
        throw new Error('Invalid buy-in amount!');
    }

    // Find player
    const player = this.players.find(p => p.userId.equals(playerId));
    if(!player) {
        throw new Error('Player not found in game!');
    }

    // Add buy-ins to player's record
    player.additionalBuyIns.push({
        amount: amount,
        timestamp: new Date()
    });

    // Update current amount
    player.currentAmount += amount;

    // If banker is active update pool amount
    if (this.hasBanker){
        this.bankerTracking.totalPoolAmount += amount;
        this.bankerTracking.transactions.push({
            playerId: playerId,
            type: 'additional-buy-in',
            amount: amount
        });
    }
    return this.save();
};



// Helper method to get player balance 
gameSchema.methods.getPlayerBalance = function(playerId) {
    const player = this.players.find(p => p.userId.equals(playerId));
    if (!player) {
        throw new Error('Player not found');
    }

    return {
        currentAmount: player.currentAmount,
        totalBuyIn: player.initialBuyIn +
            player.additionalBuyIns.reduce((sum, buyIn) => sum + buyIn.amount, 0),
        winnings: player.winnings
    };
};


// - - - - - 3. Summary Methods - - - - - 


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



// Method to end the game and calculate final settlements
gameSchema.methods.endGame = async function() {
    if (this.gameStatus !== 'in-progress'){
        throw new Error('Cannot end a game currently in progress');
    }

    // If there is a banker, validate final settlements
    if(this.hasBanker) {
        this.validateBankerOptions('end-game');
    }

    //Calculate results for each player
    const finalResults = this.players.map(player =>({
        userId: player.userId,
        initialBuyIn: player.initialBuyIn,
        finalAmount: player.currentAmount,
        totalProfit: player.winnings,
        additionalBuyIns: player.additionalBuyIns.reduce((sum, buyIn) => 
            sum + buyIn.amount, 0)
    }));

    this.gameStatus = 'completed';
    this.endedAt = new Date();

    await this.save();
    return finalResults;
};





const Game = mongoose.model('Game', gameSchema);
module.exports = Game;