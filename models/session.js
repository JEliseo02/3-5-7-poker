const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    password: { type: String, required: true },
    host: { type: String, required: true }, // The host's username
    players: { type: [String], default: [] } // Array of usernames for players who joined
});

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
