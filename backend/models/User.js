const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },

    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },

    password: {
        type: String,
        required: true
    },

    role: {
        type: String,
        enum: ["admin", "client"],
        required: true
    },

    clientId: {
        type: String,
        default: null
    },

    passwordResetTokenHash: {
        type: String,
        default: null
    },

    passwordResetExpiresAt: {
        type: Date,
        default: null
    },

    notifications: {
        type: [
            new mongoose.Schema(
                {
                    notificationId: { type: String, required: true },
                    message: { type: String, required: true },
                    type: { type: String, default: "info" },
                    createdAt: { type: String, default: "" },
                    read: { type: Boolean, default: false }
                },
                { _id: false }
            )
        ],
        default: []
    },

    rememberedSessionTokenHash: {
        type: String,
        default: null
    },

    rememberedSessionExpiresAt: {
        type: Date,
        default: null
    }
});

module.exports = mongoose.model("User", userSchema);
