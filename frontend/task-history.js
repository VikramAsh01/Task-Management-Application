const historyList = document.getElementById("historyList");
const historyCount = document.getElementById("historyCount");
const historySearch = document.getElementById("historySearch");
const clientHistoryList = document.getElementById("clientHistoryList");
const clientHistoryCount = document.getElementById("clientHistoryCount");
let taskHistoryRecords = [];
let clientHistoryRecords = [];

function historyEscape(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function historyDate(value) {
    if (!value) return "Not recorded";
    const date = new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleString() : historyEscape(value);
}

function historyCard(record) {
    const submissions = Array.isArray(record.submissions) ? record.submissions : [];
    const timeline = Array.isArray(record.taskHistory) ? record.taskHistory : [];
    const feedbackEntries = timeline.filter((entry) => entry.feedback);
    if (record.currentFeedback && !feedbackEntries.some((entry) => entry.feedback === record.currentFeedback)) {
        feedbackEntries.push({ action: "Current admin feedback", by: record.assignedByAdminName, feedback: record.currentFeedback });
    }
    const fileList = submissions.length
        ? `<ul class="history-files">${submissions.map((file, index) => `<li><strong>${historyEscape(file.fileName || `Client report ${index + 1}`)}</strong><span>${historyEscape(file.status || "Submitted")} · ${historyDate(file.submittedAt)}</span></li>`).join("")}</ul>`
        : `<p class="history-empty-note">No client report was submitted.</p>`;
    const feedbackList = feedbackEntries.length
        ? `<div class="history-feedback-list">${feedbackEntries.map((entry) => `<article><strong>${historyEscape(entry.action || "Admin feedback")}</strong><span>${historyEscape(entry.by || "Administrator")} · ${historyDate(entry.date)}</span><p>${historyEscape(entry.feedback)}</p></article>`).join("")}</div>`
        : `<p class="history-empty-note">No change request feedback was recorded.</p>`;
    const timelineList = timeline.length
        ? `<ol class="history-timeline">${timeline.map((entry) => `<li><strong>${historyEscape(entry.action || "Task update")}</strong><span>${historyEscape(entry.by || "System")} · ${historyDate(entry.date)}</span>${entry.feedback ? `<p>${historyEscape(entry.feedback)}</p>` : ""}</li>`).join("")}</ol>`
        : `<p class="history-empty-note">No additional task events were recorded.</p>`;
    const statusClass = String(record.finalStatus || "").toLowerCase().replaceAll(" ", "-");

    return `<article class="history-card">
        <div class="history-card-heading">
            <div><p class="history-client-name">${historyEscape(record.clientName || "Client")} · ${historyEscape(record.clientEmail || "")}</p><h2>${historyEscape(record.title || "Untitled task")}</h2></div>
            <span class="history-status ${historyEscape(statusClass)}">${historyEscape(record.finalStatus || "Archived")}</span>
        </div>
        <p class="history-description">${historyEscape(record.description || "No task description recorded.")}</p>
        <dl class="history-meta">
            <div><dt>Assigned by</dt><dd>${historyEscape(record.assignedByAdminName || "Administrator")}</dd></div>
            <div><dt>Assigned on</dt><dd>${historyDate(record.assignedAt)}</dd></div>
            <div><dt>Deadline</dt><dd>${historyDate(record.deadline)}</dd></div>
            <div><dt>Archived on</dt><dd>${historyDate(record.archivedAt)}</dd></div>
            <div><dt>Task outcome</dt><dd>${historyEscape(record.archiveReason || "Archived")}</dd></div>
            <div><dt>Admin attachment</dt><dd>${historyEscape(record.adminAttachmentName || "No file uploaded")}</dd></div>
            <div><dt>Client submissions</dt><dd>${submissions.length ? `${submissions.length} report${submissions.length === 1 ? "" : "s"} submitted` : "Not submitted"}</dd></div>
        </dl>
        <details class="history-section" open><summary>Client reports and uploaded file names</summary>${fileList}</details>
        <details class="history-section" open><summary>Admin change requests and feedback</summary>${feedbackList}</details>
        <details class="history-section"><summary>Task event history</summary>${timelineList}</details>
    </article>`;
}

function renderTaskHistory() {
    const query = historySearch.value.trim().toLowerCase();
    const matching = taskHistoryRecords.filter((record) => {
        const searchable = [record.title, record.clientName, record.clientEmail, record.assignedByAdminName,
            record.finalStatus, record.archiveReason, record.adminAttachmentName,
            ...(record.submissions || []).map((item) => item.fileName),
            ...(record.taskHistory || []).flatMap((item) => [item.action, item.by, item.feedback])]
            .join(" ").toLowerCase();
        return searchable.includes(query);
    });
    historyCount.textContent = `${matching.length} archived task${matching.length === 1 ? "" : "s"}`;
    historyList.innerHTML = matching.length
        ? matching.map(historyCard).join("")
        : `<div class="history-empty">${taskHistoryRecords.length ? "No archived tasks match your search." : "No tasks have been archived yet."}</div>`;
    renderClientHistory();
}

function renderClientHistory() {
    const query = historySearch.value.trim().toLowerCase();
    const records = clientHistoryRecords.filter((client) => {
        const taskText = (client.tasks || []).map((task) => [task.title, task.assignedBy, task.status,
            task.attachmentName, ...(task.submissions || []).map((item) => item.fileName),
            ...(task.history || []).map((item) => item.feedback)].join(" ")).join(" ");
        return [client.name, client.email, client.phone, client.designation, client.removedBy,
            client.removalReason, taskText].join(" ").toLowerCase().includes(query);
    });
    clientHistoryCount.textContent = `${records.length} removed client${records.length === 1 ? "" : "s"}`;
    clientHistoryList.innerHTML = records.length ? records.map((client) => {
        const tasks = Array.isArray(client.tasks) ? client.tasks : [];
        const taskHTML = tasks.length ? tasks.map((task) => {
            const files = (task.submissions || []).map((file) => historyEscape(file.fileName || "Unnamed report"));
            const feedback = (task.history || []).filter((entry) => entry.feedback);
            return `<article class="removed-client-task">
                <div class="removed-task-heading"><strong>${historyEscape(task.title || "Untitled task")}</strong><span class="history-status ${historyEscape(String(task.status || "").toLowerCase())}">${historyEscape(task.status || "Pending")}</span></div>
                <p>Assigned by ${historyEscape(task.assignedBy || "Administrator")} · Deadline: ${historyDate(task.deadline)}</p>
                <p>Admin file: ${historyEscape(task.attachmentName || "No file uploaded")}</p>
                <p>Client reports: ${files.length ? files.join(", ") : "Not submitted"}</p>
                ${feedback.length ? `<div class="removed-task-feedback"><strong>Change request feedback</strong>${feedback.map((entry) => `<p>${historyEscape(entry.by || "Administrator")}: ${historyEscape(entry.feedback)}</p>`).join("")}</div>` : ""}
            </article>`;
        }).join("") : `<p class="history-empty-note">This client had no assigned tasks.</p>`;
        return `<article class="history-card removed-client-card">
            <div class="history-card-heading"><div><p class="history-client-name">Removed ${historyDate(client.removedAt)}</p><h2>${historyEscape(client.name)}</h2></div><span class="history-status incomplete">Removed</span></div>
            <dl class="history-meta">
                <div><dt>Email</dt><dd>${historyEscape(client.email || "Not recorded")}</dd></div>
                <div><dt>Phone</dt><dd>${historyEscape(client.phone || "Not recorded")}</dd></div>
                <div><dt>Role / designation</dt><dd>${historyEscape(client.designation || "Not recorded")}</dd></div>
                <div><dt>Removed by</dt><dd>${historyEscape(client.removedBy || "Administrator")}</dd></div>
                <div><dt>Removal reason</dt><dd>${historyEscape(client.removalReason || "No reason provided")}</dd></div>
                <div><dt>Archived tasks</dt><dd>${tasks.length}</dd></div>
            </dl>
            <details class="history-section"><summary>Client tasks and their file / feedback history</summary><div class="removed-client-tasks">${taskHTML}</div></details>
        </article>`;
    }).join("") : `<div class="history-empty">${clientHistoryRecords.length ? "No removed clients match your search." : "No clients have been removed."}</div>`;
}

async function loadTaskHistory() {
    let session = null;
    try {
        const saved = sessionStorage.getItem("taskAdminSession") || localStorage.getItem("taskAdminSession");
        session = JSON.parse(saved || "null");
        if (session && !sessionStorage.getItem("taskAdminSession")) sessionStorage.setItem("taskAdminSession", saved);
    } catch {}
    if (!session?.authToken || session.role !== "admin") {
        window.location.replace("index.html");
        return;
    }
    try {
        const response = await fetch("/api/admin/task-history", { headers: { Authorization: `Bearer ${session.authToken}` } });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Unable to load task history.");
        taskHistoryRecords = Array.isArray(result.history) ? result.history : [];
        const clientResponse = await fetch("/api/admin/client-history", { headers: { Authorization: `Bearer ${session.authToken}` } });
        const clientResult = await clientResponse.json();
        if (!clientResponse.ok || !clientResult.success) throw new Error(clientResult.message || "Unable to load removed client history.");
        clientHistoryRecords = Array.isArray(clientResult.history) ? clientResult.history : [];
        renderTaskHistory();
    } catch (error) {
        historyCount.textContent = "Task history could not be loaded.";
        historyList.innerHTML = `<div class="history-empty">${historyEscape(error.message || "Unable to load task history.")}</div>`;
        clientHistoryCount.textContent = "Removed client history could not be loaded.";
        clientHistoryList.innerHTML = `<div class="history-empty">${historyEscape(error.message || "Unable to load client history.")}</div>`;
    }
}

historySearch.addEventListener("input", renderTaskHistory);
loadTaskHistory();
window.setInterval(() => {
    if (!document.hidden) loadTaskHistory();
}, 15 * 1000);
