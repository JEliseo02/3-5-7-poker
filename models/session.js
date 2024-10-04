const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    password: { type: String, required: true }
});

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;
