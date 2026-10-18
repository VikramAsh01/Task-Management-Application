const express = require("express");
const path = require("path");
const fs = require("fs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { randomBytes, createHash } = require("crypto");
const { OAuth2Client } = require("google-auth-library");

const envFilePath = path.join(__dirname, "../.env");
if (fs.existsSync(envFilePath)) process.loadEnvFile(envFilePath);

const User = require("./models/User");
const Client = require("./models/Client");
const TaskHistory = require("./models/TaskHistory");
const ClientHistory = require("./models/ClientHistory");
const config = require("./config");

const app = express();

const activeSessions = new Map();
const googleOAuthClient = new OAuth2Client(config.googleClientId);
const passwordResetAttempts = new Map();

function hashResetToken(token) {
    return createHash("sha256").update(token).digest("hex");
}

function hasEmailDeliveryConfig() {
    return Boolean(
        config.resendApiKey &&
        config.resendFromEmail &&
        !/your_|placeholder/i.test(config.resendApiKey) &&
        !/your-|placeholder/i.test(config.resendFromEmail)
    );
}

function isResetRequestAllowed(ipAddress) {
    const now = Date.now();
    const windowMs = 15 * 60 * 1000;
    const previous = passwordResetAttempts.get(ipAddress) || [];
    const recent = previous.filter((timestamp) => now - timestamp < windowMs);

    if (recent.length >= 3) {
        passwordResetAttempts.set(ipAddress, recent);
        return false;
    }

    recent.push(now);
    passwordResetAttempts.set(ipAddress, recent);
    return true;
}

async function sendPasswordResetEmail(user, token) {
    if (!hasEmailDeliveryConfig()) {
        throw new Error("Resend email settings are missing from .env");
    }

    const resetUrl = `${config.appBaseUrl}/reset-password.html?token=${encodeURIComponent(token)}`;
    const safeName = String(user.name || "there").replace(/[&<>"']/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${config.resendApiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            from: config.resendFromEmail,
            to: [user.email],
            subject: "Reset your Task Management password",
            html: `<p>Hello ${safeName},</p><p>Use the button below to reset your password. This link expires in 20 minutes and can only be used once.</p><p><a href="${resetUrl}" style="display:inline-block;padding:12px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px">Reset password</a></p><p>If you did not request this, you can ignore this email.</p>`
        })
    });

    if (!response.ok) {
        const details = await response.text();
        throw new Error(`Resend returned ${response.status}: ${details}`);
    }
}

function escapeHtml(value) {
    return String(value || "").replace(/[&<>\"']/g, (character) => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
}

async function sendReminderEmail(client, task, reminder) {
    if (!hasEmailDeliveryConfig()) {
        throw new Error("Resend email settings are not configured");
    }

    const clientAccount = await User.findOne({ role: "client", clientId: client.clientId })
        .select("email");
    const recipientEmail = clientAccount?.email || client.email;
    if (!recipientEmail) throw new Error("The client account has no email address");

    const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
            Authorization: `Bearer ${config.resendApiKey}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            from: config.resendFromEmail,
            to: [recipientEmail],
            subject: `Task reminder: ${task.title}`,
            html: `<p>Hello ${escapeHtml(client.name)},</p><p>This is a reminder for your task <strong>${escapeHtml(task.title)}</strong>.</p><p>${escapeHtml(task.description || "")}</p><p>Reminder time: ${escapeHtml(new Date(reminder.date).toLocaleString())}</p>`
        })
    });

    if (!response.ok) {
        throw new Error(`Resend returned ${response.status}: ${await response.text()}`);
    }
}

async function createSession(user, rememberMe = false) {
    const token =
        randomBytes(32).toString("hex");

    const expiresAt = Date.now() + (rememberMe
        ? 30 * 24 * 60 * 60 * 1000
        : 12 * 60 * 60 * 1000);

    if (rememberMe) {
        user.rememberedSessionTokenHash = hashResetToken(token);
        user.rememberedSessionExpiresAt = new Date(expiresAt);
        await user.save();
    } else if (user.rememberedSessionTokenHash) {
        user.rememberedSessionTokenHash = null;
        user.rememberedSessionExpiresAt = null;
        await user.save();
    }

    activeSessions.set(
        token,
        {
            userId: String(user._id),
            role: user.role,
            name: user.name,
            clientId: user.clientId || null,
            expiresAt,
            remembered: rememberMe
        }
    );

    return token;

}

async function findSessionByToken(token) {
    if (!token) return null;

    const cachedSession = activeSessions.get(token);
    if (cachedSession && cachedSession.expiresAt > Date.now()) {
        return cachedSession;
    }
    if (cachedSession) activeSessions.delete(token);

    const user = await User.findOne({
        rememberedSessionTokenHash: hashResetToken(token),
        rememberedSessionExpiresAt: { $gt: new Date() }
    }).select("name role clientId rememberedSessionExpiresAt");

    if (!user) return null;

    const session = {
        userId: String(user._id),
        role: user.role,
        name: user.name,
        clientId: user.clientId || null,
        expiresAt: new Date(user.rememberedSessionExpiresAt).getTime(),
        remembered: true
    };
    activeSessions.set(token, session);
    return session;
}

function clientRemovalMessage(reason) {
    const baseMessage = "Your client account has been removed by the administrator.";
    return reason
        ? `${baseMessage} Reason: ${reason}`
        : baseMessage;
}

async function requireAdmin(req, res, next) {

    const authorization =
        req.get("authorization") || "";

    const token =
        authorization.startsWith("Bearer ")
            ? authorization.slice(7)
            : "";

    let session;
    try {
        session = await findSessionByToken(token);
    } catch (error) {
        console.error("Session validation error:", error);
        return res.status(500).json({ success: false, message: "Unable to verify your session." });
    }

    if (
        !session ||
        session.expiresAt <= Date.now()
    ) {

        activeSessions.delete(token);

        return res.status(401).json({

            success: false,

            message:
                "Please log in again to perform this action"

        });

    }

    if (session.role !== "admin") {

        return res.status(403).json({

            success: false,

            message:
                "Only an administrator can perform this action"

        });

    }

    req.authenticatedSession = session;

    next();

}

async function requireAdminOrOwnClient(req, res, next) {
    const authorization = req.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    let session;
    try {
        session = await findSessionByToken(token);
    } catch (error) {
        console.error("Session validation error:", error);
        return res.status(500).json({ success: false, message: "Unable to verify your session." });
    }

    if (!session || session.expiresAt <= Date.now()) {
        activeSessions.delete(token);
        return res.status(401).json({ success: false, message: "Please log in again." });
    }
    if (session.role === "admin") {
        req.authenticatedSession = session;
        return next();
    }
    if (session.role === "client" && session.clientId === req.params.clientId) {
        try {
            const client = await Client.findOne({ clientId: session.clientId })
                .select("isRemoved removalReason");
            if (!client || client.isRemoved) {
                activeSessions.delete(token);
                return res.status(403).json({
                    success: false,
                    message: clientRemovalMessage(client?.removalReason)
                });
            }
        } catch (error) {
            console.error("Client access check failed:", error);
            return res.status(500).json({ success: false, message: "Unable to verify client access." });
        }
        req.authenticatedSession = session;
        return next();
    }
    return res.status(403).json({ success: false, message: "You can only view your own client account." });
}

async function requireOwnClient(req, res, next) {
    const authorization = req.get("authorization") || "";
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    let session;
    try {
        session = await findSessionByToken(token);
    } catch (error) {
        console.error("Session validation error:", error);
        return res.status(500).json({ success: false, message: "Unable to verify your session." });
    }

    if (!session || session.expiresAt <= Date.now()) {
        activeSessions.delete(token);
        return res.status(401).json({ success: false, message: "Please log in again." });
    }
    if (session.role !== "client" || session.clientId !== req.params.clientId) {
        return res.status(403).json({ success: false, message: "You can only access your own client account." });
    }
    try {
        const client = await Client.findOne({ clientId: session.clientId })
            .select("isRemoved removalReason");
        if (!client || client.isRemoved) {
            activeSessions.delete(token);
            return res.status(403).json({
                success: false,
                message: clientRemovalMessage(client?.removalReason)
            });
        }
    } catch (error) {
        console.error("Client access check failed:", error);
        return res.status(500).json({ success: false, message: "Unable to verify client access." });
    }
    req.authenticatedSession = session;
    return next();
}

function createNotification(message, type) {
    return {
        notificationId: `notification-${Date.now()}-${randomBytes(4).toString("hex")}`,
        message,
        type: type || "info",
        createdAt: new Date().toISOString(),
        read: false
    };
}

const NOTIFICATION_TTL_MS = 24 * 60 * 60 * 1000;

function pruneExpiredNotifications(document, now = Date.now()) {
    if (!Array.isArray(document.notifications)) return false;

    const cutoff = now - NOTIFICATION_TTL_MS;
    const remaining = document.notifications.filter((notification) => {
        const createdAt = new Date(notification.createdAt).getTime();
        return Number.isFinite(createdAt) && createdAt > cutoff;
    });
    const changed = remaining.length !== document.notifications.length;
    if (changed) document.notifications = remaining;
    return changed;
}

async function cleanupExpiredNotifications() {
    const cutoff = new Date(Date.now() - NOTIFICATION_TTL_MS).toISOString();
    const expiredNotification = {
        $or: [
            { createdAt: { $lte: cutoff } },
            { createdAt: { $exists: false } },
            { createdAt: "" }
        ]
    };

    await Promise.all([
        Client.updateMany(
            { notifications: { $exists: true } },
            { $pull: { notifications: expiredNotification } }
        ),
        User.updateMany(
            { role: "admin" },
            { $pull: { notifications: expiredNotification } }
        )
    ]);
}

async function addClientNotification(client, message, type) {
    client.notifications.push(createNotification(message, type));
    if (client.notifications.length > 50) {
        client.notifications.splice(0, client.notifications.length - 50);
    }
}

async function addAdminNotification(message, type) {
    const notification = createNotification(message, type);
    await User.updateMany(
        { role: "admin" },
        { $push: { notifications: { $each: [notification], $slice: -50 } } }
    );
}

async function addAdminNotificationToUser(adminId, message, type) {
    if (!adminId) return;
    const notification = createNotification(message, type);
    await User.updateOne(
        { _id: adminId, role: "admin" },
        { $push: { notifications: { $each: [notification], $slice: -50 } } }
    );
}

function resolveTaskAdminOwner(task, adminUsers) {
    const knownOwner = adminUsers.find(
        (admin) => String(admin._id) === String(task.assignedByAdminId || "")
    );
    if (knownOwner) return knownOwner;
    if (task.assignedByAdminId) return null;

    const assignedBy = String(task.assignedBy || "").trim().toLowerCase();
    const nameMatches = assignedBy
        ? adminUsers.filter((admin) => String(admin.name || "").trim().toLowerCase() === assignedBy)
        : [];
    const owner = nameMatches.length === 1
        ? nameMatches[0]
        : adminUsers.length === 1
            ? adminUsers[0]
            : null;

    if (owner) {
        task.assignedByAdminId = String(owner._id);
        if (!assignedBy || assignedBy === "admin") task.assignedBy = owner.name;
    }
    return owner;
}

async function archiveTaskToHistory(client, task, archiveReason, archivedAt, adminUsers) {
    const owner = resolveTaskAdminOwner(task, adminUsers);
    const completedAt = task.completedAt || (task.history || [])
        .filter((entry) => entry.action === "Submission approved")
        .map((entry) => new Date(entry.date))
        .filter((date) => Number.isFinite(date.getTime()))
        .sort((a, b) => b - a)[0] || null;
    const record = {
        taskId: task.taskId,
        clientId: client.clientId,
        clientName: client.name,
        clientEmail: client.email,
        title: task.title,
        description: task.description || "",
        priority: task.priority || "Medium",
        assignedByAdminId: owner ? String(owner._id) : String(task.assignedByAdminId || ""),
        assignedByAdminName: task.assignedBy && task.assignedBy.trim().toLowerCase() !== "admin"
            ? task.assignedBy
            : owner?.name || "Administrator",
        assignedAt: task.assignedAt || null,
        deadline: task.deadline || "",
        finalStatus: task.status || "Incomplete",
        completedAt,
        archivedAt,
        archiveReason,
        adminAttachmentName: task.attachment?.name || "",
        submissions: (task.submissions || []).map((submission) => ({
            fileName: submission.fileName || "",
            submittedAt: submission.submittedAt || "",
            status: submission.status || "Submitted"
        })),
        taskHistory: (task.history || []).map((entry) => ({
            action: entry.action || "",
            date: entry.date || "",
            by: entry.by || "",
            feedback: entry.feedback || ""
        })),
        currentFeedback: task.feedback || ""
    };

    await TaskHistory.updateOne(
        { taskId: task.taskId },
        { $setOnInsert: record },
        { upsert: true }
    );
    return owner;
}

function createClientHistoryTaskSnapshot(task) {
    return {
        taskId: task.taskId,
        title: task.title,
        description: task.description || "",
        priority: task.priority || "Medium",
        status: task.status || "Pending",
        assignedBy: task.assignedBy || "Administrator",
        assignedByAdminId: task.assignedByAdminId || "",
        assignedAt: task.assignedAt || null,
        deadline: task.deadline || "",
        completedAt: task.completedAt || null,
        isDeleted: Boolean(task.isDeleted),
        deletedAt: task.deletedAt || null,
        deletedBy: task.deletedBy || "",
        deletionReason: task.deletionReason || "",
        attachmentName: task.attachment?.name || "",
        feedback: task.feedback || "",
        reminders: (task.reminders || []).map((reminder) => ({
            date: reminder.date || "",
            method: reminder.method || ""
        })),
        submissions: (task.submissions || []).map((submission) => ({
            fileName: submission.fileName || "",
            submittedAt: submission.submittedAt || "",
            status: submission.status || "Submitted"
        })),
        history: (task.history || []).map((entry) => ({
            action: entry.action || "",
            date: entry.date || "",
            by: entry.by || "",
            feedback: entry.feedback || ""
        }))
    };
}

const REMINDER_CHECK_INTERVAL_MS = 15 * 1000;
const REMINDER_EMAIL_RETRY_MS = 15 * 60 * 1000;
const TASK_ARCHIVE_GRACE_MS = 24 * 60 * 60 * 1000;
let reminderDeliveryInProgress = false;
let deadlineCheckInProgress = false;
let taskArchiveInProgress = false;

async function deliverDueReminders() {
    if (reminderDeliveryInProgress) return;
    reminderDeliveryInProgress = true;

    try {
        const now = new Date();
        const clients = await Client.find({ "tasks.reminders.0": { $exists: true } });

        for (const client of clients) {
            if (client.isRemoved) continue;
            let clientChanged = false;

            for (const task of client.tasks || []) {
                if (task.isDeleted) continue;
                for (const reminder of task.reminders || []) {
                    const reminderDate = new Date(reminder.date);
                    if (!Number.isFinite(reminderDate.getTime()) || reminderDate > now) continue;

                    const method = reminder.method === "notification" ? "website" : reminder.method;
                    const message = `Reminder: ${task.title}`;

                    if ((method === "website" || method === "both") && !reminder.notificationSentAt) {
                        await addClientNotification(client, message, "task-reminder");
                        reminder.notificationSentAt = now;
                        clientChanged = true;
                    }

                    const emailRetryReady = !reminder.emailLastAttemptAt ||
                        now.getTime() - new Date(reminder.emailLastAttemptAt).getTime() >= REMINDER_EMAIL_RETRY_MS;

                    if ((method === "email" || method === "both") && !reminder.emailSentAt && emailRetryReady) {
                        reminder.emailLastAttemptAt = now;
                        clientChanged = true;
                        await client.save();

                        try {
                            await sendReminderEmail(client, task, reminder);
                            reminder.emailSentAt = new Date();
                            clientChanged = true;
                        } catch (error) {
                            console.error(`Reminder email failed for ${client.email} (${task.taskId}):`, error.message);
                        }
                    }
                }
            }

            if (clientChanged) await client.save();
        }
    } catch (error) {
        console.error("Scheduled reminder delivery error:", error);
    } finally {
        reminderDeliveryInProgress = false;
    }
}

async function checkOverdueTasks() {
    if (deadlineCheckInProgress) return;
    deadlineCheckInProgress = true;

    try {
        const now = new Date();
        const adminUsers = await User.find({ role: "admin" }).select("name");
        const clients = await Client.find({ isRemoved: { $ne: true }, "tasks.0": { $exists: true } });

        for (const client of clients) {
            let clientChanged = false;

            for (const task of client.tasks || []) {
                if (task.isDeleted) continue;
                const deadline = new Date(task.deadline);
                if (
                    !Number.isFinite(deadline.getTime()) ||
                    deadline > now ||
                    task.status === "Completed" ||
                    task.deadlineNotifiedAt
                ) {
                    continue;
                }

                const owner = resolveTaskAdminOwner(task, adminUsers);
                const deadlineText = deadline.toLocaleString();
                const adminName = owner?.name || task.assignedBy || "the assigning administrator";
                const clientMessage = `The deadline for "${task.title}" has passed. It is now marked Incomplete. Contact ${adminName} if you need an extension.`;
                const adminMessage = `The deadline for "${task.title}" assigned to ${client.name} has passed. The task is now marked Incomplete.`;

                task.status = "Incomplete";
                task.deadlineNotifiedAt = now;
                task.history.push({
                    action: "Deadline passed",
                    date: now.toISOString(),
                    by: "System",
                    feedback: `The deadline (${deadlineText}) passed. Task marked Incomplete.`
                });

                await addClientNotification(client, clientMessage, "task-overdue");
                if (owner) {
                    await addAdminNotificationToUser(owner._id, adminMessage, "task-overdue");
                } else {
                    console.warn(`No unique assigning admin could be resolved for overdue task ${task.taskId}.`);
                }
                clientChanged = true;
            }

            if (clientChanged) await client.save();
        }
    } catch (error) {
        console.error("Overdue task check failed:", error);
    } finally {
        deadlineCheckInProgress = false;
    }
}

async function archiveExpiredTasks() {
    if (taskArchiveInProgress) return;
    taskArchiveInProgress = true;
    try {
        const now = new Date();
        const adminUsers = await User.find({ role: "admin" }).select("name");
        const removedClientCutoff = new Date(now.getTime() - TASK_ARCHIVE_GRACE_MS);
        const expiredRemovedClients = await Client.find({
            isRemoved: true,
            removedAt: { $lte: removedClientCutoff },
            historyArchivedAt: null
        });
        for (const removedClient of expiredRemovedClients) {
            const taskSnapshots = (removedClient.tasks || []).map(createClientHistoryTaskSnapshot);
            await ClientHistory.updateOne(
                { clientId: removedClient.clientId },
                { $setOnInsert: {
                    clientId: removedClient.clientId,
                    name: removedClient.name,
                    email: removedClient.email,
                    phone: removedClient.phone,
                    designation: removedClient.designation,
                    removedAt: removedClient.removedAt,
                    removedBy: removedClient.removedBy || "Administrator",
                    removalReason: removedClient.removalReason || "",
                    tasks: taskSnapshots
                } },
                { upsert: true }
            );
            removedClient.historyArchivedAt = now;
            await removedClient.save();
        }
        const clients = await Client.find({ "tasks.0": { $exists: true } });

        for (const client of clients) {
            let changed = false;
            const retainedTasks = [];
            const removedClientAt = client.removedAt ? new Date(client.removedAt) : null;
            const clientRemovalExpired = client.isRemoved && removedClientAt &&
                Number.isFinite(removedClientAt.getTime()) &&
                now.getTime() - removedClientAt.getTime() >= TASK_ARCHIVE_GRACE_MS;
            for (const task of client.tasks || []) {
                if (client.isRemoved && !clientRemovalExpired) {
                    retainedTasks.push(task);
                    continue;
                }
                const deletedAt = task.deletedAt ? new Date(task.deletedAt) : null;
                const deadline = new Date(task.deadline || "");
                const approvedAt = task.completedAt || (task.history || [])
                    .filter((entry) => entry.action === "Submission approved")
                    .map((entry) => new Date(entry.date))
                    .filter((date) => Number.isFinite(date.getTime()))
                    .sort((a, b) => b - a)[0];
                const taskRemovalExpired = !clientRemovalExpired && task.isDeleted && deletedAt &&
                    Number.isFinite(deletedAt.getTime()) &&
                    now.getTime() - deletedAt.getTime() >= TASK_ARCHIVE_GRACE_MS;
                const completionExpired = !clientRemovalExpired && !task.isDeleted && task.status === "Completed" && approvedAt &&
                    Number.isFinite(new Date(approvedAt).getTime()) &&
                    now.getTime() - new Date(approvedAt).getTime() >= TASK_ARCHIVE_GRACE_MS;
                const deadlineExpired = !clientRemovalExpired && !task.isDeleted && task.status !== "Completed" &&
                    Number.isFinite(deadline.getTime()) &&
                    now.getTime() - deadline.getTime() >= TASK_ARCHIVE_GRACE_MS;

                if (!clientRemovalExpired && !taskRemovalExpired && !completionExpired && !deadlineExpired) {
                    retainedTasks.push(task);
                    continue;
                }

                if (deadlineExpired && task.status !== "Incomplete") {
                    task.status = "Incomplete";
                    task.deadlineNotifiedAt = task.deadlineNotifiedAt || deadline;
                    task.history.push({
                        action: "Deadline passed",
                        date: deadline.toISOString(),
                        by: "System",
                        feedback: "Task archived 24 hours after the deadline because the deadline was not extended."
                    });
                }

                const reason = clientRemovalExpired
                    ? `Client removed by ${client.removedBy || "an administrator"}: ${client.removalReason || "No reason provided"}. Archived after the client's 24-hour dashboard period.`
                    : taskRemovalExpired
                        ? `Deleted by ${task.deletedBy || "an administrator"}: ${task.deletionReason || "No reason provided"}. Archived 24 hours after removal.`
                        : completionExpired
                            ? "Completed and approved; archived 24 hours after approval."
                            : "Deadline passed without an extension; archived 24 hours after the deadline.";
                const owner = await archiveTaskToHistory(client, task, reason, now, adminUsers);
                await addClientNotification(
                    client,
                    `The task "${task.title}" has been moved to administrator task history after its 24-hour retention period.`,
                    "task-archived"
                );
                if (owner) {
                    await addAdminNotificationToUser(
                        owner._id,
                        `The task "${task.title}" for ${client.name} has been archived to task history.`,
                        "task-archived"
                    );
                }
                changed = true;
            }

            if (changed) {
                client.tasks = retainedTasks;
                await client.save();
            }
        }
    } catch (error) {
        console.error("Task history archival failed:", error);
    } finally {
        taskArchiveInProgress = false;
    }
}

let taskLifecycleInProgress = false;
async function runTaskLifecycle() {
    if (taskLifecycleInProgress) return;
    taskLifecycleInProgress = true;
    try {
        await checkOverdueTasks();
        await archiveExpiredTasks();
    } finally {
        taskLifecycleInProgress = false;
    }
}

const PORT = 5000;

const MONGO_URI =
    "mongodb://127.0.0.1:27017/task_management";

app.use(
    express.json({
        limit: "8mb"
    })
);

app.use(
    express.static(
        path.join(
            __dirname,
            "../frontend"
        )
    )
);

app.get("/", (req, res) => {
    res.sendFile(
        path.join(
            __dirname,
            "../frontend/index.html"
        )
    );
});

app.get("/api/config/google", (req, res) => {
    const googleClientId = config.googleClientId.startsWith("PASTE_")
        ? ""
        : config.googleClientId;
    return res.json({ success: true, googleClientId });
});

app.post("/api/auth/password-reset/request", async (req, res) => {
    const email = String(req.body.email || "").toLowerCase().trim();
    const genericMessage = "If an account exists for that email, a password reset link will be sent.";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ success: false, message: "Enter a valid email address." });
    }
    if (!hasEmailDeliveryConfig()) {
        return res.status(503).json({
            success: false,
            message: "Password recovery email is not configured yet. Add the Resend settings to the local .env file."
        });
    }
    if (!isResetRequestAllowed(req.ip)) {
        return res.status(429).json({ success: false, message: "Too many reset requests. Try again in 15 minutes." });
    }

    try {
        const user = await User.findOne({ email });
        if (user) {
            const token = randomBytes(32).toString("hex");
            user.passwordResetTokenHash = hashResetToken(token);
            user.passwordResetExpiresAt = new Date(Date.now() + 20 * 60 * 1000);
            await user.save();

            try {
                await sendPasswordResetEmail(user, token);
            } catch (emailError) {
                user.passwordResetTokenHash = null;
                user.passwordResetExpiresAt = null;
                await user.save();
                console.error("Password reset email delivery failed:", emailError.message);
            }
        }

        return res.json({ success: true, message: genericMessage });
    } catch (error) {
        console.error("Password reset request error:", error);
        return res.status(500).json({ success: false, message: "Unable to process the reset request right now." });
    }
});

app.post("/api/auth/password-reset/confirm", async (req, res) => {
    try {
        const token = String(req.body.token || "");
        const password = String(req.body.password || "");

        if (!token || password.length < 8) {
            return res.status(400).json({ success: false, message: "Use a valid reset link and a password with at least 8 characters." });
        }

        const user = await User.findOne({
            passwordResetTokenHash: hashResetToken(token),
            passwordResetExpiresAt: { $gt: new Date() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: "This reset link is invalid or expired. Request a new one." });
        }

        user.password = await bcrypt.hash(password, 12);
        user.passwordResetTokenHash = null;
        user.passwordResetExpiresAt = null;
        user.rememberedSessionTokenHash = null;
        user.rememberedSessionExpiresAt = null;
        await user.save();

        for (const [sessionToken, session] of activeSessions) {
            if (session.userId === String(user._id)) activeSessions.delete(sessionToken);
        }

        return res.json({ success: true, message: "Password reset successfully. You can now sign in." });
    } catch (error) {
        console.error("Password reset confirmation error:", error);
        return res.status(500).json({ success: false, message: "Unable to reset the password right now." });
    }
});

app.get("/api/auth/session", async (req, res) => {
    try {
        const authorization = req.get("authorization") || "";
        const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
        const session = await findSessionByToken(token);
        if (!session) {
            return res.status(401).json({ success: false, message: "This remembered session has expired. Please sign in again." });
        }

        if (session.role === "client") {
            const client = await Client.findOne({ clientId: session.clientId });
            if (!client || client.isRemoved) {
                activeSessions.delete(token);
                return res.status(403).json({
                    success: false,
                    message: clientRemovalMessage(client?.removalReason)
                });
            }
        }

        const user = await User.findById(session.userId).select("name email role clientId");
        if (!user) {
            activeSessions.delete(token);
            return res.status(401).json({ success: false, message: "This account is no longer available." });
        }

        return res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                clientId: user.clientId
            }
        });
    } catch (error) {
        console.error("Remembered session validation error:", error);
        return res.status(500).json({ success: false, message: "Unable to restore the remembered session." });
    }
});

app.post("/api/logout", async (req, res) => {
    try {
        const authorization = req.get("authorization") || "";
        const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
        if (token) {
            activeSessions.delete(token);
            await User.updateOne(
                { rememberedSessionTokenHash: hashResetToken(token) },
                { $set: { rememberedSessionTokenHash: null, rememberedSessionExpiresAt: null } }
            );
        }
        return res.json({ success: true });
    } catch (error) {
        console.error("Logout error:", error);
        return res.status(500).json({ success: false, message: "Unable to end the session cleanly." });
    }
});

app.post("/api/auth/google/client", async (req, res) => {
    try {
        const { credential } = req.body;
        if (!config.googleClientId || config.googleClientId.startsWith("PASTE_")) {
            return res.status(503).json({
                success: false,
                message: "Google sign-in is not configured yet. Add the OAuth Client ID in backend/config.js."
            });
        }
        if (typeof credential !== "string" || !credential) {
            return res.status(400).json({ success: false, message: "Google did not provide a sign-in credential." });
        }

        const ticket = await googleOAuthClient.verifyIdToken({
            idToken: credential,
            audience: config.googleClientId
        });
        const googleAccount = ticket.getPayload();
        const email = String(googleAccount?.email || "").toLowerCase().trim();

        if (!email || googleAccount.email_verified !== true) {
            return res.status(401).json({ success: false, message: "Use a Google account with a verified email address." });
        }

        const client = await Client.findOne({ email });
        if (!client) {
            return res.status(403).json({
                success: false,
                message: "This email was not added as a client by the administrator."
            });
        }
        if (client.isRemoved) {
            return res.status(403).json({
                success: false,
                message: clientRemovalMessage(client.removalReason)
            });
        }

        let user = await User.findOne({ email });
        if (user && (user.role !== "client" || user.clientId !== client.clientId)) {
            return res.status(403).json({
                success: false,
                message: "This email is not linked to a client login. Contact the administrator."
            });
        }

        if (!user) {
            const generatedPassword = randomBytes(48).toString("hex");
            user = await User.create({
                name: client.name,
                email,
                password: await bcrypt.hash(generatedPassword, 12),
                role: "client",
                clientId: client.clientId
            });
        }

        const token = await createSession(user);
        return res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: client.name,
                email: user.email,
                role: user.role,
                clientId: user.clientId
            }
        });
    } catch (error) {
        console.error("Google client sign-in error:", error);
        return res.status(401).json({
            success: false,
            message: "Google sign-in could not be verified. Please try again."
        });
    }
});

app.post("/api/login", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;

        if (!email || !password) {

            return res.status(400).json({
                success: false,
                message: "Email and password are required"
            });

        }

        const user =
            await User.findOne({
                email:
                    email
                        .toLowerCase()
                        .trim()
            });

        if (!user) {

            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });

        }

        if (user.role === "client") {
            const client = await Client.findOne({ clientId: user.clientId });
            if (!client || client.isRemoved) {
                return res.status(403).json({
                    success: false,
                    message: clientRemovalMessage(client?.removalReason)
                });
            }
        }

        const passwordMatch =
            await bcrypt.compare(
                password,
                user.password
            );

        if (!passwordMatch) {

            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });

        }

        const rememberMe = req.body.rememberMe === true;
        const token = await createSession(user, rememberMe);

        return res.json({

            success: true,

            token: token,

            message: "Login successful",

            user: {

                id: user._id,

                name: user.name,

                email: user.email,

                role: user.role,

                clientId: user.clientId

            }

        });

    } catch (error) {

        console.error(
            "Login error:",
            error
        );

        return res.status(500).json({

            success: false,

            message: "Server error during login"

        });

    }

});

app.post("/api/client-register", async (req, res) => {

    try {

        const {
            email,
            password
        } = req.body;

        if (!email || !password) {

            return res.status(400).json({

                success: false,

                message:
                    "Email and password are required"

            });

        }

        if (String(password).length < 8) {

            return res.status(400).json({

                success: false,

                message:
                    "Password must be at least 8 characters long"

            });

        }

        const normalizedEmail =
            String(email)
                .toLowerCase()
                .trim();

        const client =
            await Client.findOne({
                email: normalizedEmail
            });

        if (!client) {

            return res.status(404).json({

                success: false,

                message:
                    "This email is not registered as a client. Ask the administrator to add you first."

            });

        }

        if (client.isRemoved) {
            return res.status(403).json({
                success: false,
                message: clientRemovalMessage(client.removalReason)
            });
        }

        const existingUser =
            await User.findOne({
                email: normalizedEmail
            });

        if (existingUser) {

            return res.status(409).json({

                success: false,

                message:
                    "An account already exists for this email. Please log in."

            });

        }

        const hashedPassword =
            await bcrypt.hash(
                password,
                12
            );

        const user =
            new User({

                name: client.name,

                email: normalizedEmail,

                password: hashedPassword,

                role: "client",

                clientId: client.clientId

            });

        await user.save();

        const token =
            await createSession(user);

        return res.status(201).json({

            success: true,

            token: token,

            message:
                "Client account created successfully",

            user: {

                id: user._id,

                name: user.name,

                email: user.email,

                role: user.role,

                clientId: user.clientId

            }

        });

    } catch (error) {

        console.error(
            "Client registration error:",
            error
        );

        if (error.code === 11000) {

            return res.status(409).json({

                success: false,

                message:
                    "An account already exists for this email. Please log in."

            });

        }

        return res.status(500).json({

            success: false,

            message:
                "Server error while creating client account"

        });

    }

});

app.post("/api/clients", requireAdmin, async (req, res) => {

    try {

        const {
            name,
            phone,
            designation,
            email,
            tasks
        } = req.body;

        if (
            !name ||
            !phone ||
            !designation ||
            !email
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Name, phone, designation and email are required"

            });

        }

        const normalizedEmail =
            email
                .toLowerCase()
                .trim();

        const existingClient =
            await Client.findOne({

                email:
                    normalizedEmail

            });

        if (existingClient) {

            return res.status(409).json({

                success: false,

                message:
                    "A client with this email already exists"

            });

        }

        const clientId =
            `client-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 8)}`;

        const client =
            new Client({

                clientId:
                    clientId,

                name:
                    name.trim(),

                phone:
                    phone.trim(),

                designation:
                    designation.trim(),

                email:
                    normalizedEmail,

                tasks:
                    Array.isArray(tasks)
                        ? tasks
                        : []

            });

        for (const task of client.tasks) {
            await addClientNotification(
                client,
                `A new task, "${task.title}", has been assigned to you.`,
                "task-assigned"
            );
        }

        const savedClient =
            await client.save();

        return res.status(201).json({

            success: true,

            message:
                "Client created successfully",

            client:
                savedClient

        });

    } catch (error) {

        console.error(
            "Create client error:",
            error
        );

        if (
            error.code === 11000
        ) {

            return res.status(409).json({

                success: false,

                message:
                    "A client with this information already exists"

            });

        }

        return res.status(500).json({

            success: false,

            message:
                "Server error while creating client"

        });

    }

});

app.get("/api/clients", requireAdmin, async (req, res) => {

    try {

        const dashboardCutoff = new Date(Date.now() - TASK_ARCHIVE_GRACE_MS);
        const clients =
            await Client.find({
                $or: [
                    { isRemoved: { $ne: true } },
                    { isRemoved: true, removedAt: { $gt: dashboardCutoff } }
                ]
            })
                .sort({
                    createdAt: -1
                });

        const activeClients = clients.map((clientDocument) => {
            const client = clientDocument.toObject();
            return client;
        });

        return res.json({

            success: true,

            clients:
                activeClients

        });

    } catch (error) {

        console.error(
            "Get clients error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Server error while fetching clients"

        });

    }

});

app.delete("/api/clients/:clientId", requireAdmin, async (req, res) => {
    try {
        const reason = String(req.body?.reason || "").trim();
        if (!reason) {
            return res.status(400).json({ success: false, message: "Provide a reason for removing this client." });
        }
        if (reason.length > 500) {
            return res.status(400).json({ success: false, message: "The removal reason must be 500 characters or fewer." });
        }

        const client = await Client.findOne({ clientId: req.params.clientId });
        if (!client) {
            return res.status(404).json({ success: false, message: "Client not found." });
        }
        if (client.isRemoved) {
            return res.status(409).json({ success: false, message: "This client has already been removed." });
        }

        const removedAt = new Date();
        const administratorName = req.authenticatedSession.name || "Administrator";
        client.isRemoved = true;
        client.removalReason = reason;
        client.removedAt = removedAt;
        client.removedBy = administratorName;
        await client.save();

        await User.updateMany(
            { role: "client", clientId: client.clientId },
            { $set: { passwordResetTokenHash: null, passwordResetExpiresAt: null } }
        );

        return res.json({
            success: true,
            message: `${client.name} has been removed. Their account is disabled and the removal reason will be shown when they try to log in.`
        });
    } catch (error) {
        console.error("Remove client error:", error);
        return res.status(500).json({ success: false, message: "Unable to remove this client right now." });
    }
});

app.get("/api/clients/:clientId", requireAdminOrOwnClient, async (req, res) => {

    try {

        const clientId =
            req.params.clientId;

        const client =
            await Client.findOne({

                clientId:
                    clientId

            });

        if (!client) {

            return res.status(404).json({

                success: false,

                message:
                    "Client not found"

            });

        }

        if (client.isRemoved && (
            req.authenticatedSession?.role !== "admin" ||
            !client.removedAt ||
            Date.now() - new Date(client.removedAt).getTime() >= TASK_ARCHIVE_GRACE_MS
        )) {
            return res.status(404).json({
                success: false,
                message: "This client has been moved to client history."
            });
        }

        pruneExpiredNotifications(client);

        const clientData = client.toObject();

        return res.json({

            success: true,

            client:
                clientData

        });

    } catch (error) {

        console.error(
            "Get client error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Server error while fetching client"

        });

    }

});

app.post(
    "/api/clients/:clientId/tasks",
    requireAdmin,
    async (req, res) => {

        try {

            const clientId =
                req.params.clientId;

            const {
                title,
                description,
                priority,
                deadline,
                status,
                assignedBy,
                attachment,
                reminders,
                submissions,
                history
            } = req.body;

            if (!title) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Task title is required"

                });

            }

            if (
                attachment &&
                Number(attachment.size) > 5 * 1024 * 1024
            ) {

                return res.status(413).json({

                    success: false,

                    message:
                        "Task attachments must be 5 MB or smaller"

                });

            }

            const client =
                await Client.findOne({

                    clientId:
                        clientId

                });

            if (!client) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Client not found"

                });

            }

            if (client.isRemoved) {
                return res.status(409).json({
                    success: false,
                    message: "Tasks cannot be added to a removed client."
                });
            }

            const taskId =
                `task-${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2, 8)}`;

            const task = {

                taskId:
                    taskId,

                title:
                    title.trim(),

                description:
                    description
                        ? description.trim()
                        : "",

                priority:
                    priority ||
                    "Medium",

                deadline:
                    deadline ||
                    "",

                status:
                    status ||
                    "Pending",

                assignedBy:
                    req.authenticatedSession.name || assignedBy || "Admin",

                assignedByAdminId:
                    String(req.authenticatedSession.userId),

                assignedAt:
                    new Date(),

                completedAt:
                    null,

                deadlineNotifiedAt:
                    null,

                attachment:
                    attachment
                        ? {
                            name: attachment.name || "",
                            type: attachment.type || "",
                            size: Number(attachment.size) || 0,
                            fileData:
                                typeof attachment.fileData === "string" &&
                                attachment.fileData.startsWith("data:")
                                    ? attachment.fileData
                                    : ""
                        }
                        : {
                            name: "",
                            type: "",
                            size: 0,
                            fileData: ""
                        },

                reminders:
                    Array.isArray(reminders)
                        ? reminders
                            .filter((reminder) => reminder && reminder.date)
                            .map((reminder) => ({
                                reminderId:
                                    reminder.reminderId ||
                                    `reminder-${Date.now()}-${Math.random()
                                        .toString(36)
                                        .slice(2, 8)}`,
                                date: Number.isFinite(new Date(reminder.date).getTime())
                                    ? new Date(reminder.date).toISOString()
                                    : String(reminder.date),
                                method: reminder.method || "both",
                                notificationSentAt: null,
                                emailSentAt: null,
                                emailLastAttemptAt: null
                            }))
                        : [],

                submissions:
                    Array.isArray(submissions)
                        ? submissions
                        : [],

                feedback:
                    "",

                history:
                    Array.isArray(history)
                        ? history
                        : []

            };

            client.tasks.push(
                task
            );

            await addClientNotification(
                client,
                `A new task, "${task.title}", has been assigned to you.`,
                "task-assigned"
            );

            await client.save();

            return res.status(201).json({

                success: true,

                message:
                    "Task created successfully",

                task:
                    task

            });

        } catch (error) {

            console.error(
                "Create task error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Server error while creating task"

            });

        }

    }
);

app.put(
    "/api/clients/:clientId/tasks/:taskId/status",
    requireAdmin,
    async (req, res) => {

        try {

            const {
                clientId,
                taskId
            } = req.params;

            const {
                status,
                feedback
            } = req.body;

            const allowedStatuses = [
                "Pending",
                "Submitted",
                "Completed"
            ];

            if (
                !allowedStatuses.includes(
                    status
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid task status"

                });

            }

            const client =
                await Client.findOne({

                    clientId:
                        clientId

                });

            if (!client) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Client not found"

                });

            }

            const task =
                client.tasks.find(
                    (item) =>
                        item.taskId ===
                        taskId
                );

            if (!task || task.isDeleted) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Task not found"

                });

            }

            if (
                status === "Completed" &&
                task.status !== "Submitted"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Only submitted tasks can be marked as completed"

                });

            }

            const previousStatus = task.status;

            task.status =
                status;

            if (status === "Completed") {
                task.completedAt = new Date();
            } else if (status === "Pending") {
                task.completedAt = null;
            }

            if (feedback !== undefined) {

                if (
                    status !== "Pending" ||
                    typeof feedback !== "string" ||
                    !feedback.trim()
                ) {

                    return res.status(400).json({

                        success: false,

                        message:
                            "Feedback is required when requesting changes"

                    });

                }

                const requestedAt =
                    new Date().toISOString();

                task.feedback =
                    feedback.trim();

                task.history.push({

                    action:
                        "Changes requested",

                    date:
                        requestedAt,

                    by:
                        req.authenticatedSession.name || "Admin",

                    feedback:
                        feedback.trim()

                });

                await addClientNotification(
                    client,
                    `Changes were requested for "${task.title}": ${feedback.trim()}`,
                    "changes-requested"
                );

            } else if (status === "Completed" && previousStatus !== "Completed") {

                task.history.push({
                    action: "Submission approved",
                    date: new Date().toISOString(),
                    by: req.authenticatedSession.name || "Admin"
                });

                await addClientNotification(
                    client,
                    `Your submission for "${task.title}" was accepted and the task is complete.`,
                    "task-accepted"
                );

}

            await client.save();

            return res.json({

                success: true,

                message:
                    "Task status updated successfully",

                task:
                    task

            });

        } catch (error) {

            console.error(
                "Update task status error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Server error while updating task status"

            });

        }

    }
);

app.put("/api/clients/:clientId/tasks/:taskId/deadline", requireAdmin, async (req, res) => {
    try {
        const newDeadline = new Date(req.body?.deadline || "");
        if (!Number.isFinite(newDeadline.getTime())) {
            return res.status(400).json({ success: false, message: "Choose a valid new deadline." });
        }
        if (newDeadline <= new Date()) {
            return res.status(400).json({ success: false, message: "The new deadline must be in the future." });
        }

        const client = await Client.findOne({ clientId: req.params.clientId });
        if (!client || client.isRemoved) {
            return res.status(404).json({ success: false, message: "Active client not found." });
        }
        const task = client.tasks.find((item) => item.taskId === req.params.taskId);
        if (!task || task.isDeleted) {
            return res.status(404).json({ success: false, message: "Task not found." });
        }
        if (task.status === "Completed") {
            return res.status(400).json({ success: false, message: "A completed task’s deadline cannot be changed." });
        }

        const admins = await User.find({ role: "admin" }).select("name");
        const assignedAdmin = resolveTaskAdminOwner(task, admins);
        if (!assignedAdmin) {
            return res.status(409).json({
                success: false,
                message: "The assigning administrator could not be identified for this older task. Ask an administrator to reassign the task before extending its deadline."
            });
        }
        if (String(assignedAdmin._id) !== String(req.authenticatedSession.userId)) {
            return res.status(403).json({
                success: false,
                message: "Only the administrator who assigned this task can extend its deadline."
            });
        }

        const previousDeadline = new Date(task.deadline);
        if (Number.isFinite(previousDeadline.getTime()) && newDeadline <= previousDeadline) {
            return res.status(400).json({ success: false, message: "The new deadline must be later than the current deadline." });
        }

        const now = new Date();
        const oldDeadlineText = Number.isFinite(previousDeadline.getTime())
            ? previousDeadline.toLocaleString()
            : "the previous deadline";
        task.deadline = newDeadline.toISOString();
        if (task.status === "Incomplete") task.status = "Pending";
        task.deadlineNotifiedAt = null;
        task.history.push({
            action: "Deadline extended",
            date: now.toISOString(),
            by: req.authenticatedSession.name || "Administrator",
            feedback: `Deadline changed from ${oldDeadlineText} to ${newDeadline.toLocaleString()}.`
        });

        await addClientNotification(
            client,
            `The deadline for "${task.title}" was extended by ${req.authenticatedSession.name || "the administrator"} to ${newDeadline.toLocaleString()}.`,
            "deadline-extended"
        );
        await client.save();

        return res.json({ success: true, message: "Task deadline extended successfully.", task });
    } catch (error) {
        console.error("Extend task deadline error:", error);
        return res.status(500).json({ success: false, message: "Unable to extend the task deadline." });
    }
});

app.get("/api/admin/notifications", requireAdmin, async (req, res) => {
    try {
        const admin = await User.findById(req.authenticatedSession.userId)
            .select("notifications");
        if (!admin) {
            return res.status(404).json({ success: false, message: "Admin account not found" });
        }
        pruneExpiredNotifications(admin);
        const notifications = admin.notifications || [];
        return res.json({
            success: true,
            notifications,
            unreadCount: notifications.filter((item) => !item.read).length
        });
    } catch (error) {
        console.error("Get admin notifications error:", error);
        return res.status(500).json({ success: false, message: "Unable to load notifications" });
    }
});

app.get("/api/admin/task-history", requireAdmin, async (req, res) => {
    try {
        await runTaskLifecycle();
        const records = await TaskHistory.find({})
            .select("-__v")
            .sort({ archivedAt: -1, assignedAt: -1 })
            .lean();
        return res.json({ success: true, history: records });
    } catch (error) {
        console.error("Load admin task history error:", error);
        return res.status(500).json({ success: false, message: "Unable to load task history." });
    }
});

app.get("/api/admin/client-history", requireAdmin, async (req, res) => {
    try {
        await runTaskLifecycle();
        const archiveCutoff = new Date(Date.now() - TASK_ARCHIVE_GRACE_MS);
        const records = await ClientHistory.find({ removedAt: { $lte: archiveCutoff } })
            .select("-__v")
            .sort({ removedAt: -1 })
            .lean();
        return res.json({ success: true, history: records });
    } catch (error) {
        console.error("Load admin client history error:", error);
        return res.status(500).json({ success: false, message: "Unable to load removed client history." });
    }
});

app.put("/api/admin/notifications/read", requireAdmin, async (req, res) => {
    try {
        const admin = await User.findById(req.authenticatedSession.userId);
        if (!admin) {
            return res.status(404).json({ success: false, message: "Admin account not found" });
        }
        pruneExpiredNotifications(admin);
        admin.notifications.forEach((notification) => { notification.read = true; });
        await admin.save();
        return res.json({ success: true });
    } catch (error) {
        console.error("Mark admin notifications read error:", error);
        return res.status(500).json({ success: false, message: "Unable to update notifications" });
    }
});

app.put("/api/clients/:clientId/notifications/read", requireOwnClient, async (req, res) => {
    try {
        const client = await Client.findOne({ clientId: req.params.clientId });
        if (!client) {
            return res.status(404).json({ success: false, message: "Client not found" });
        }
        pruneExpiredNotifications(client);
        client.notifications.forEach((notification) => { notification.read = true; });
        await client.save();
        return res.json({ success: true });
    } catch (error) {
        console.error("Mark client notifications read error:", error);
        return res.status(500).json({ success: false, message: "Unable to update notifications" });
    }
});

app.delete(
    "/api/clients/:clientId/tasks/:taskId",
    requireAdmin,
    async (req, res) => {

        try {

            const reason = String(req.body?.reason || "").trim();
            if (!reason) {
                return res.status(400).json({
                    success: false,
                    message: "Provide a reason for removing this task."
                });
            }
            if (reason.length > 500) {
                return res.status(400).json({
                    success: false,
                    message: "The removal reason must be 500 characters or fewer."
                });
            }

            const {
                clientId,
                taskId
            } = req.params;

            const client =
                await Client.findOne({
                    clientId: clientId
                });

            if (!client) {

                return res.status(404).json({
                    success: false,
                    message: "Client not found"
                });

            }

            if (client.isRemoved) {
                return res.status(403).json({ success: false, message: "Removed client records are read-only during the 24-hour history period." });
            }

            const taskIndex =
                client.tasks.findIndex(
                    (item) => item.taskId === taskId
                );

            if (taskIndex === -1) {

                return res.status(404).json({
                    success: false,
                    message: "Task not found"
                });

            }

            if (client.isRemoved) {
                return res.status(403).json({ success: false, message: "Removed client records are read-only during the 24-hour history period." });
            }

            const task =
                client.tasks[taskIndex];

            if (task.isDeleted) {
                return res.status(409).json({ success: false, message: "This task has already been removed and is waiting to enter history." });
            }

            if (task.status !== "Completed") {
                return res.status(400).json({
                    success: false,
                    message: "Only completed tasks approved by an administrator can be removed."
                });
            }

            const administratorName = req.authenticatedSession?.name || "Administrator";
            const removedAt = new Date();
            task.isDeleted = true;
            task.deletedAt = removedAt;
            task.deletedBy = administratorName;
            task.deletionReason = reason;
            task.history.push({
                action: "Task removed",
                date: removedAt.toISOString(),
                by: administratorName,
                feedback: reason
            });
            await addClientNotification(
                client,
                `The task "${task.title}" was removed by ${administratorName}. It will move to task history after 24 hours. Reason: ${reason}`,
                "task-deleted"
            );

            await client.save();

            return res.json({
                success: true,
                message: "Task removed from active dashboards. It will be archived to history after 24 hours, and the client was notified.",
                task,
            });

        } catch (error) {

            console.error(
                "Delete completed task error:",
                error
            );

            return res.status(500).json({
                success: false,
                message: "Server error while deleting task"
            });

        }

    }
);

app.post(
    "/api/clients/:clientId/tasks/:taskId/submissions",
    requireOwnClient,
    async (req, res) => {

        try {

            const {
                clientId,
                taskId
            } = req.params;

            const {
                fileName,
                fileType,
                fileSize,
                fileData
            } = req.body;

            if (
                !fileName ||
                !fileType ||
                !Number.isFinite(Number(fileSize)) ||
                Number(fileSize) <= 0 ||
                !fileData
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "A file name, type, size and file data are required"

                });

            }

            const maxFileSize =
                5 * 1024 * 1024;

            if (
                Number(fileSize) > maxFileSize
            ) {

                return res.status(413).json({

                    success: false,

                    message:
                        "Submission files must be 5 MB or smaller"

                });

            }

            if (
                typeof fileData !== "string" ||
                !fileData.startsWith("data:")
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "File data must be provided as a data URL"

                });

            }

            const client =
                await Client.findOne({

                    clientId:
                        clientId

                });

            if (!client) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Client not found"

                });

            }

            if (client.isRemoved) {
                return res.status(403).json({ success: false, message: "Removed client records are read-only during the 24-hour history period." });
            }

            const task =
                client.tasks.find(
                    (item) =>
                        item.taskId === taskId
                );

            if (!task || task.isDeleted) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Task not found"

                });

            }

            const taskDeadline = new Date(task.deadline);
            if (Number.isFinite(taskDeadline.getTime()) && taskDeadline <= new Date()) {
                return res.status(403).json({
                    success: false,
                    message: "This task deadline has passed. Uploads are locked until the assigning administrator extends the deadline."
                });
            }

            if (task.status === "Completed") {

                return res.status(400).json({

                    success: false,

                    message:
                        "Completed tasks cannot receive new submissions"

                });

            }

            if (task.status === "Submitted") {

                return res.status(400).json({

                    success: false,

                    message:
                        "This task is already submitted and waiting for review"

                });

            }

            const submission = {

                submissionId:
                    `submission-${Date.now()}-${Math.random()
                        .toString(36)
                        .slice(2, 8)}`,

                fileName:
                    String(fileName).trim(),

                fileType:
                    String(fileType).trim(),

                fileSize:
                    Number(fileSize),

                fileData:
                    fileData,

                submittedAt:
                    new Date().toISOString(),

                status:
                    "Submitted"

            };

            task.submissions.push(
                submission
            );

            task.status =
                "Submitted";

            task.feedback =
                "";

            task.history.push({

                action:
                    "Submission received",

                date:
                    submission.submittedAt,

                by:
                    "Client"

            });

            await client.save();

            await addAdminNotification(
                `${client.name} submitted work for "${task.title}".`,
                "client-submission"
            );

            return res.status(201).json({

                success: true,

                message:
                    "Submission saved successfully",

                submission:
                    submission,

                task:
                    task

            });

        } catch (error) {

            console.error(
                "Create submission error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Server error while saving submission"

            });

        }

    }
);

app.post(
    "/api/clients/:clientId/tasks/:taskId/reminders",
    requireAdmin,
    async (req, res) => {

        try {

            const {
                clientId,
                taskId
            } = req.params;

            const {
                date,
                method
            } = req.body;

            if (!date) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Reminder date is required"

                });

            }

            const allowedMethods = [
                "email",
                "website",
                "notification",
                "both"
            ];

            const reminderMethod =
                method || "both";

            if (
                !allowedMethods.includes(
                    reminderMethod
                )
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "Invalid reminder method"

                });

            }

            const reminderDate = new Date(date);
            if (!Number.isFinite(reminderDate.getTime())) {
                return res.status(400).json({
                    success: false,
                    message: "Enter a valid reminder date and time"
                });
            }

            const client =
                await Client.findOne({

                    clientId:
                        clientId

                });

            if (!client) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Client not found"

                });

            }

            if (client.isRemoved) {
                return res.status(403).json({ success: false, message: "Removed client records are read-only during the 24-hour history period." });
            }

            const task =
                client.tasks.find(
                    (item) =>
                        item.taskId ===
                        taskId
                );

            if (!task || task.isDeleted) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Task not found"

                });

            }

            const reminderId =
                `reminder-${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2, 8)}`;

            const reminder = {

                reminderId:
                    reminderId,

                date:
                    reminderDate.toISOString(),

                method:
                    reminderMethod,

                notificationSentAt: null,
                emailSentAt: null,
                emailLastAttemptAt: null

            };

            task.reminders.push(
                reminder
            );

            await client.save();

            return res.status(201).json({

                success: true,

                message:
                    "Reminder added successfully",

                reminder:
                    reminder,

                task:
                    task

            });

        } catch (error) {

            console.error(
                "Create reminder error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Server error while creating reminder"

            });

        }

    }
);

app.delete(
    "/api/clients/:clientId/tasks/:taskId/reminders/:reminderId",
    requireAdmin,
    async (req, res) => {

        try {

            const {
                clientId,
                taskId,
                reminderId
            } = req.params;

            const client =
                await Client.findOne({

                    clientId:
                        clientId

                });

            if (!client) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Client not found"

                });

            }

            if (client.isRemoved) {
                return res.status(403).json({ success: false, message: "Removed client records are read-only during the 24-hour history period." });
            }

            const task =
                client.tasks.find(
                    (item) =>
                        item.taskId ===
                        taskId
                );

            if (!task || task.isDeleted) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Task not found"

                });

            }

            const reminderIndex =
                task.reminders.findIndex(
                    (item) =>
                        item.reminderId ===
                        reminderId
                );

            if (
                reminderIndex === -1
            ) {

                return res.status(404).json({

                    success: false,

                    message:
                        "Reminder not found"

                });

            }

            task.reminders.splice(
                reminderIndex,
                1
            );

            await client.save();

            return res.json({

                success: true,

                message:
                    "Reminder deleted successfully",

                task:
                    task

            });

        } catch (error) {

            console.error(
                "Delete reminder error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Server error while deleting reminder"

            });

        }

    }
);

mongoose
    .connect(MONGO_URI)
    .then(() => {

        console.log(
            "MongoDB connected successfully"
        );

        const notificationCleanupTimer = setInterval(() => {
            cleanupExpiredNotifications().catch((error) => {
                console.error("Notification expiry cleanup error:", error);
            });
        }, 60 * 1000);
        notificationCleanupTimer.unref();

        cleanupExpiredNotifications().catch((error) => {
            console.error("Initial notification expiry cleanup error:", error);
        });

        deliverDueReminders().catch((error) => {
            console.error("Initial scheduled reminder delivery error:", error);
        });
        runTaskLifecycle().catch((error) => {
            console.error("Initial task lifecycle processing error:", error);
        });

        const reminderDeliveryTimer = setInterval(() => {
            deliverDueReminders().catch((error) => {
                console.error("Scheduled reminder delivery error:", error);
            });
        }, REMINDER_CHECK_INTERVAL_MS);
        reminderDeliveryTimer.unref();

        const taskLifecycleTimer = setInterval(() => {
            runTaskLifecycle().catch((error) => {
                console.error("Scheduled task lifecycle processing error:", error);
            });
        }, REMINDER_CHECK_INTERVAL_MS);
        taskLifecycleTimer.unref();

        app.listen(
            PORT,
            () => {

                console.log(
                    `Server running at http://localhost:${PORT}`
                );

            }
        );

    })
    .catch((error) => {

        console.error(
            "MongoDB connection failed:",
            error
        );

    });
