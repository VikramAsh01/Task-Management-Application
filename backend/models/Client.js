const mongoose = require("mongoose");

const taskSchema = new mongoose.Schema(
    {
        taskId: {
            type: String,
            required: true
        },

        title: {
            type: String,
            required: true
        },

        description: {
            type: String,
            default: ""
        },

        priority: {
            type: String,
            enum: ["Low", "Medium", "High"],
            default: "Medium"
        },

        deadline: {
            type: String,
            default: ""
        },

        assignedByAdminId: {
            type: String,
            default: ""
        },

        deadlineNotifiedAt: {
            type: Date,
            default: null
        },

        assignedAt: {
            type: Date,
            default: null
        },

        completedAt: {
            type: Date,
            default: null
        },

        isDeleted: {
            type: Boolean,
            default: false
        },

        deletedAt: {
            type: Date,
            default: null
        },

        deletedBy: {
            type: String,
            default: ""
        },

        deletionReason: {
            type: String,
            default: ""
        },

        status: {
            type: String,
            default: "Pending"
        },

        assignedBy: {
            type: String,
            default: "Admin"
        },

        attachment: {
            name: {
                type: String,
                default: ""
            },

            type: {
                type: String,
                default: ""
            },

            size: {
                type: Number,
                default: 0
            },

            fileData: {
                type: String,
                default: ""
            }
        },

        reminders: [
            {
                reminderId: {
                    type: String,
                    required: true
                },

                date: {
                    type: String,
                    required: true
                },

                method: {
                    type: String,
                    default: "both"
                },

                notificationSentAt: {
                    type: Date,
                    default: null
                },

                emailSentAt: {
                    type: Date,
                    default: null
                },

                emailLastAttemptAt: {
                    type: Date,
                    default: null
                }
            }
        ],

        submissions: [
            {
                submissionId: {
                    type: String,
                    required: true
                },

                fileName: {
                    type: String,
                    default: ""
                },

                fileType: {
                    type: String,
                    default: ""
                },

                fileSize: {
                    type: Number,
                    default: 0
                },

                fileData: {
                    type: String,
                    default: ""
                },

                submittedAt: {
                    type: String,
                    default: ""
                },

                status: {
                    type: String,
                    default: "Submitted"
                }
            }
        ],

        feedback: {
            type: String,
            default: ""
        },

        history: [
            {
                action: {
                    type: String,
                    default: ""
                },

                date: {
                    type: String,
                    default: ""
                },

                by: {
                    type: String,
                    default: ""
                },

                feedback: {
                    type: String,
                    default: ""
                }
            }
        ]
    },
    {
        _id: false
    }
);

const clientSchema = new mongoose.Schema(
    {
        clientId: {
            type: String,
            required: true,
            unique: true
        },

        name: {
            type: String,
            required: true,
            trim: true
        },

        phone: {
            type: String,
            required: true,
            trim: true
        },

        designation: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },

        isRemoved: {
            type: Boolean,
            default: false
        },

        removalReason: {
            type: String,
            default: ""
        },

        removedAt: {
            type: Date,
            default: null
        },

        removedBy: {
            type: String,
            default: ""
        },

        historyArchivedAt: {
            type: Date,
            default: null
        },

        tasks: {
            type: [taskSchema],
            default: []
        },

    notifications: {
            type: [
                new mongoose.Schema(
                    {
                        notificationId: {
                            type: String,
                            required: true
                        },

                        message: {
                            type: String,
                            required: true
                        },

                        type: {
                            type: String,
                            default: "info"
                        },

                        createdAt: {
                            type: String,
                            default: ""
                        },

                        read: {
                            type: Boolean,
                            default: false
                        }
                    },
                    {
                        _id: false
                    }
                )
            ],
            default: []
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model(
    "Client",
    clientSchema
);
