const mongoose = require("mongoose");

const taskHistorySchema = new mongoose.Schema(
    {
        taskId: { type: String, required: true, unique: true, index: true },
        clientId: { type: String, required: true, index: true },
        clientName: { type: String, default: "Client" },
        clientEmail: { type: String, default: "" },
        title: { type: String, required: true },
        description: { type: String, default: "" },
        priority: { type: String, default: "Medium" },
        assignedByAdminId: { type: String, default: "", index: true },
        assignedByAdminName: { type: String, default: "Administrator" },
        assignedAt: { type: Date, default: null },
        deadline: { type: String, default: "" },
        finalStatus: { type: String, required: true },
        completedAt: { type: Date, default: null },
        currentFeedback: { type: String, default: "" },
        archivedAt: { type: Date, default: Date.now },
        archiveReason: { type: String, required: true },
        adminAttachmentName: { type: String, default: "" },
        submissions: {
            type: [{
                fileName: { type: String, default: "" },
                submittedAt: { type: String, default: "" },
                status: { type: String, default: "Submitted" }
            }],
            default: []
        },
        taskHistory: {
            type: [{
                action: { type: String, default: "" },
                date: { type: String, default: "" },
                by: { type: String, default: "" },
                feedback: { type: String, default: "" }
            }],
            default: []
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("TaskHistory", taskHistorySchema);
