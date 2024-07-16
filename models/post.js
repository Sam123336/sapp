//post.js
const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true
    },
    mimetype: {
        type: String,
        required: true
    }
});

const postSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User" // Refers to the User model
    },
    date: {
        type: Date,
        default: Date.now
    },
    content: {
        type: String,
        required: true
    },
    media: { 
        type: [mediaSchema], // Array of media objects
        required: false
    },
    likes: [
        { type: mongoose.Schema.Types.ObjectId, ref: "User" } // Array of User object IDs for likes
    ]
});

module.exports = mongoose.model("post", postSchema); // Exporting model as "Post"
