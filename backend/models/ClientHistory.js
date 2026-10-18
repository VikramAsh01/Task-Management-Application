const mongoose = require("mongoose");

const clientHistorySchema = new mongoose.Schema(
    {
        clientId: { type: String, required: true, unique: true, index: true },
        name: { type: String, required: true },
        email: { type: String, default: "" },
        phone: { type: String, default: "" },
        designation: { type: String, default: "" },
        removedAt: { type: Date, default: Date.now },
        removedBy: { type: String, default: "Administrator" },
        removalReason: { type: String, default: "" },
        tasks: { type: [mongoose.Schema.Types.Mixed], default: [] }
    },
    { timestamps: true }
);

module.exports = mongoose.model("ClientHistory", clientHistorySchema);
