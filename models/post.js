const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User" // Changed from "user" to "User"
    },
    date: {
        type: Date,
        default: Date.now
    },
    content: String,
    likes: [
        { type: mongoose.Schema.Types.ObjectId, ref: "User" } // Changed from "user" to "User"
    ]
});

module.exports = mongoose.model("post", postSchema);
