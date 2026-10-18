const params = new URLSearchParams(window.location.search);

const currentClientId = params.get("client");

const backToDashboard =
    document.getElementById("backToDashboard");

const addTaskButton =
    document.getElementById("addTaskButton");

const notification =
    document.getElementById("notification");

const taskList =
    document.getElementById("taskList");

const taskFilter =
    document.getElementById("taskFilter");

let currentClient = null;

let currentTasks = [];

let selectedTaskCard = null;

let selectedReminderContainer = null;

function getAdminAuthToken() {
    try {
        const saved = sessionStorage.getItem("taskAdminSession") || localStorage.getItem("taskAdminSession");
        if (saved && !sessionStorage.getItem("taskAdminSession")) sessionStorage.setItem("taskAdminSession", saved);
        return JSON.parse(saved || "null")?.authToken || "";
    } catch {
        return "";
    }
}


if (backToDashboard) {

    backToDashboard.addEventListener(
        "click",
        () => {

            window.location.href =
                "dashboard.html";

        }
    );

}


if (addTaskButton) {

    addTaskButton.addEventListener(
        "click",
        () => {

            if (!currentClientId) {

                alert(
                    "Client ID is missing."
                );

                return;

            }

            window.location.href =
                `add-task.html?client=${encodeURIComponent(
                    currentClientId
                )}`;

        }
    );

}


if (notification) {

    notification.addEventListener(
        "click",
        () => {

            alert(
                "Notifications will be connected later."
            );

        }
    );

}


function escapeHTML(value) {

    if (
        value === undefined ||
        value === null
    ) {

        return "";

    }

    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


function getInitial(name) {

    if (!name) {

        return "?";

    }

    return name
        .charAt(0)
        .toUpperCase();

}


function formatDate(value) {

    if (!value) {

        return "Not set";

    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return value;

    }

    return date.toLocaleString(
        "en-IN",
        {
            dateStyle:
                "long",

            timeStyle:
                "short"
        }
    );

}


function formatReminderDate(value) {

    if (!value) {

        return "No date";

    }

    const date =
        new Date(value);

    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return value;

    }

    return date.toLocaleString(
        "en-IN",
        {
            dateStyle:
                "medium",

            timeStyle:
                "short"
        }
    );

}


function getReminderMethodText(method) {

    if (method === "website" || method === "notification") {

        return "Website Notification";

    }

    if (
        method ===
        "email"
    ) {

        return "Email";

    }

    return "Website + Email";

}


function getPriorityStyle(priority) {

    const value =
        (
            priority ||
            "Medium"
        ).toLowerCase();

    if (
        value ===
        "high"
    ) {

        return {
            background:
                "#fee2e2",

            color:
                "#dc2626"
        };

    }

    if (
        value ===
        "low"
    ) {

        return {
            background:
                "#dcfce7",

            color:
                "#059669"
        };

    }

    return {
        background:
            "#fef3c7",

        color:
            "#d97706"
    };

}


function createPriorityBadge(priority) {

    const value =
        priority ||
        "Medium";

    const style =
        getPriorityStyle(
            value
        );

    return `
        <span
            class="priority-badge"
            style="
                background:${style.background};
                color:${style.color};
                font-size:11px;
                padding:5px 9px;
                border-radius:20px;
                font-weight:700;
            "
        >
            ${escapeHTML(value)}
        </span>
    `;

}


function updateStatusBadge(
    taskCard,
    status
) {

    const statusBadge =
        taskCard.querySelector(
            ".status-badge"
        );

    if (!statusBadge) {

        return;

    }

    statusBadge.textContent =
        status;

    statusBadge.className =
        "status-badge";

    if (
        status ===
        "Pending"
    ) {

        statusBadge.classList.add(
            "pending"
        );

    }

    if (
        status ===
        "Submitted"
    ) {

        statusBadge.classList.add(
            "submitted"
        );

    }

    if (
        status ===
        "Completed"
    ) {

        statusBadge.classList.add(
            "completed"
        );

    }

    if (status === "Incomplete") {
        statusBadge.classList.add("incomplete");
    }

}


function findSection(
    taskCard,
    sectionName
) {

    const sections =
        taskCard.querySelectorAll(
            ".detail-section"
        );

    for (
        const section of sections
    ) {

        const toggle =
            section.querySelector(
                ".section-toggle"
            );

        if (!toggle) {

            continue;

        }

        const span =
            toggle.querySelector(
                "span"
            );

        if (!span) {

            continue;

        }

        if (
            span.textContent.trim() ===
            sectionName
        ) {

            return section;

        }

    }

    return null;

}


function attachHistoryFileButton(
    button
) {

    if (!button) {

        return;

    }

    button.addEventListener(
        "click",
        async () => {

            const taskCard =
                button.closest(
                    ".task-card"
                );

            const task =
                currentTasks.find(
                    (item) =>
                        (item.taskId || item.id) ===
                        taskCard?.dataset.taskId
                );

            const submissionIndex =
                Number(
                    button.dataset.submissionIndex
                );

            const submission =
                task?.submissions?.[submissionIndex];

            if (
                !submission?.fileData ||
                !submission.fileData.startsWith("data:")
            ) {

                alert(
                    "The submitted file data is not available."
                );

                return;

            }

            button.disabled = true;

            try {

                const response =
                    await fetch(
                        submission.fileData
                    );

                const fileBlob =
                    await response.blob();

                const objectUrl =
                    URL.createObjectURL(
                        fileBlob
                    );

                const downloadLink =
                    document.createElement(
                        "a"
                    );

                downloadLink.href =
                    objectUrl;

                downloadLink.download =
                    submission.fileName ||
                    `submission-${submissionIndex + 1}`;

                document.body.appendChild(
                    downloadLink
                );

                downloadLink.click();
                downloadLink.remove();

                window.setTimeout(
                    () => URL.revokeObjectURL(objectUrl),
                    60000
                );

            } catch (error) {

                console.error(
                    "Download client submission error:",
                    error
                );

                alert(
                    "Unable to download the submitted file."
                );

            } finally {

                button.disabled = false;

            }

        }
    );

}


function createSubmissionHTML(task) {

    const submissions =
        Array.isArray(
            task.submissions
        )
            ? task.submissions
            : [];

    const status =
        task.status ||
        "Pending";

    if (
        status ===
        "Completed"
    ) {

        return `
            <div class="submission-box">

                <div class="submission-version">

                    <div class="version-header">

                        <span class="version-label">
                            Task Completed
                        </span>

                        <span class="approved-status">
                            ✓ Approved
                        </span>

                    </div>

                    <div class="approval-info">

                        <strong>
                            Completed by Admin
                        </strong>

                    </div>

                    ${
                        submissions.length > 0
                            ? `
                                <div class="report-box">

                                    <label>
                                        Client Report
                                    </label>

                                    <p>
                                        ${escapeHTML(
                                            submissions[
                                                submissions.length - 1
                                            ].report ||
                                            submissions[
                                                submissions.length - 1
                                            ].description ||
                                            "No report provided."
                                        )}
                                    </p>

                                    <button
                                        type="button"
                                        class="view-history-file"
                                        data-submission-index="${submissions.length - 1}"
                                    >
                                        Download Submitted File
                                    </button>

                                </div>
                            `
                            : ""
                    }

                </div>

                <div class="submission-review">

                    <div class="approved-message">

                        <div>
                            ✓
                        </div>

                        <div>

                            <strong>
                                Task Completed
                            </strong>

                            <p>
                                This submission has been
                                approved and the task is
                                now completed.
                            </p>

                        </div>

                    </div>

                </div>

            </div>
        `;

    }


    if (
        status ===
        "Submitted" &&
        submissions.length > 0
    ) {

        const latestSubmission =
            submissions[
                submissions.length - 1
            ];

        const fileName =
            latestSubmission.fileName ||
            latestSubmission.filename ||
            (
                latestSubmission.file &&
                latestSubmission.file.name
            ) ||
            "Submitted file";

        const report =
            latestSubmission.report ||
            latestSubmission.description ||
            "No report provided.";

        const submittedDate =
            latestSubmission.submittedAt ||
            latestSubmission.date ||
            "Submitted";

        return `
            <div class="submission-box">

                <div class="submission-version">

                    <div class="version-header">

                        <span class="version-label">
                            Version ${submissions.length}
                        </span>

                        <span class="submitted-date">
                            ${escapeHTML(
                                formatDate(
                                    submittedDate
                                )
                            )}
                        </span>

                    </div>

                    <div class="report-box">

                        <label>
                            Client Report
                        </label>

                        <p>
                            ${escapeHTML(report)}
                        </p>

                    </div>

                    <div class="file-row">

                        <div>

                            <strong>
                                ${escapeHTML(
                                    fileName
                                )}
                            </strong>

                            <span>
                                Client submitted file
                            </span>

                        </div>

                        <button
                            type="button"
                            class="view-history-file"
                            data-submission-index="${submissions.length - 1}"
                        >
                            Download File
                        </button>

                    </div>

                </div>

                <div class="submission-review">

                    <div class="review-buttons">

                        <button
                            type="button"
                            class="request-changes"
                        >
                            Request Changes
                        </button>

                        <button
                            type="button"
                            class="mark-completed"
                        >
                            ✓ Mark Completed
                        </button>

                    </div>

                </div>

            </div>
        `;

    }


    return `
        <div class="empty-submission">

            <div>
                📄
            </div>

            <h4>
                No submission yet
            </h4>

            <p>
                The client has not submitted this task.
            </p>

        </div>
    `;

}


function createRemindersHTML(task) {

    const reminders =
        Array.isArray(
            task.reminders
        )
            ? task.reminders
            : [];

    if (
        reminders.length ===
        0
    ) {

        return `
            <div class="reminders-list">

                <div class="empty-history">
                    No reminders added.
                </div>

            </div>

            <button
                type="button"
                class="add-reminder-button"
            >
                + Add Reminder
            </button>
        `;

    }


    return `
        <div class="reminders-list">

            ${
                reminders
                    .map(
                        (reminder) => {

                            return `
                                <div
                                    class="reminder-item"
                                    data-reminder-id="${escapeHTML(
                                        reminder.reminderId || ""
                                    )}"
                                >

                                    <div>

                                        <strong>
                                            ${escapeHTML(
                                                formatReminderDate(
                                                    reminder.date
                                                )
                                            )}
                                        </strong>

                                        <span>
                                            ${escapeHTML(
                                                getReminderMethodText(
                                                    reminder.method
                                                )
                                            )}
                                        </span>

                                    </div>

                                    <div class="reminder-actions">

                                        <button
                                            type="button"
                                            class="delete-reminder"
                                        >
                                            Delete
                                        </button>

                                    </div>

                                </div>
                            `;

                        }
                    )
                    .join("")
            }

        </div>

        <button
            type="button"
            class="add-reminder-button"
        >
            + Add Reminder
        </button>
    `;

}


function createHistoryHTML(task) {

    const history =
        Array.isArray(
            task.history
        )
            ? task.history
            : [];

    if (
        history.length ===
        0
    ) {

        return `
            <div class="empty-history">
                No previous submissions.
            </div>
        `;

    }


    return history
        .map(
            (
                item,
                index
            ) => {

                const action =
                    item.action || item.status || `Version ${index + 1}`;

                const requestedBy =
                    item.by || (item.feedback ? "Admin" : "Client");

                const date =
                    item.date ||
                    item.submittedAt ||
                    "Previous submission";

                const fileName =
                    item.fileName ||
                    "";

                const feedback =
                    item.feedback ||
                    "";

                return `
                    <div class="history-item">

                        <div>

                            <strong>
                                ${escapeHTML(
                                    action
                                )}
                            </strong>

                            <span>
                                ${escapeHTML(
                                    `By: ${requestedBy}`
                                )}
                            </span>

                            <small>
                                ${escapeHTML(
                                    date
                                )}
                            </small>

                            ${
                                fileName
                                    ? `
                                        <small>
                                            File:
                                            ${escapeHTML(
                                                fileName
                                            )}
                                        </small>
                                    `
                                    : ""
                            }

                            ${
                                feedback
                                    ? `
                                        <small>
                                            Feedback:
                                            ${escapeHTML(
                                                feedback
                                            )}
                                        </small>
                                    `
                                    : ""
                            }

                        </div>

                    </div>
                `;

            }
        )
        .join("");

}


function createTaskCard(task) {

    const taskId =
        task.taskId ||
        task.id ||
        "";

    const title =
        task.title ||
        "Untitled Task";

    const description =
        task.description ||
        "No task description provided.";

    const status =
        task.status ||
        "Pending";

    const statusClass =
        status === "Completed"
            ? "completed"
            : status === "Submitted"
                ? "submitted"
                : status === "Incomplete"
                    ? "incomplete"
                    : "pending";

    const priority =
        task.priority ||
        "Medium";

    const deadline =
        task.deadline ||
        "";

    const assignedBy =
        task.assignedBy ||
        "Admin";

    let adminSession = null;
    try { adminSession = JSON.parse(sessionStorage.getItem("taskAdminSession") || localStorage.getItem("taskAdminSession") || "null"); } catch {}
    const canExtendDeadline = adminSession && (task.assignedByAdminId ? String(task.assignedByAdminId) === String(adminSession.id) : true);


    const card =
        document.createElement(
            "div"
        );

    card.className =
        "task-card";

    card.dataset.taskId =
        taskId;

    card.dataset.task =
        title;

    card.dataset.status =
        status;


    card.innerHTML = `

        <div
            class="task-header"
            data-task-toggle
        >

            <div>

                <div class="task-title-row">

                    <h3>
                        ${escapeHTML(
                            title
                        )}
                    </h3>

                    <span class="status-badge ${statusClass}">
                        ${escapeHTML(
                            status
                        )}
                    </span>

                    ${createPriorityBadge(
                        priority
                    )}

                    <span class="task-deadline-badge">
                        Due: ${escapeHTML(formatDate(deadline))}
                    </span>

                    ${task.isDeleted ? '<span class="task-removal-badge">Removed · history in 24 hours</span>' : ""}

                    ${!task.isDeleted && canExtendDeadline && status !== "Completed" ? '<button type="button" class="extend-task-deadline">Extend deadline</button>' : ""}

                    ${!task.isDeleted ? `<button type="button" class="delete-completed-task">
                        Remove Task
                    </button>` : ""}

                </div>

                <p>
                    ${escapeHTML(
                        description
                    )}
                </p>

                ${status === "Incomplete" && !task.isDeleted ? '<p class="task-deadline-expired-notice">The deadline has passed. This task will remain visible for 24 hours after the deadline, then move to administrator-only history unless the assigning administrator extends it.</p>' : ""}
                ${task.isDeleted ? `<p class="task-deadline-expired-notice">Removed by ${escapeHTML(task.deletedBy || "an administrator")}; details remain visible until ${escapeHTML(formatDate(new Date(new Date(task.deletedAt).getTime() + 24 * 60 * 60 * 1000)))}. Reason: ${escapeHTML(task.deletionReason || "No reason provided")}</p>` : ""}

            </div>

            <span class="task-arrow">
                ▼
            </span>

        </div>

        <div class="task-body">


            <div class="detail-section">

                <button
                    type="button"
                    class="section-toggle"
                >

                    <span>
                        Task Information
                    </span>

                    <b>
                        ▼
                    </b>

                </button>


                <div class="section-content">

                    <div class="information-grid">

                        <div>

                            <label>
                                Assigned By
                            </label>

                            <strong>
                                ${escapeHTML(
                                    assignedBy
                                )}
                            </strong>

                        </div>


                    </div>


                    <div class="description-box">

                        <label>
                            Task Description
                        </label>

                        <p>
                            ${escapeHTML(
                                description
                            )}
                        </p>

                    </div>


                    ${
                        task.attachment &&
                        task.attachment.name
                            ? `
                                <div
                                    class="description-box"
                                >

                                    <label>
                                        Task Attachment
                                    </label>

                                    <p>
                                        ${escapeHTML(
                                            task.attachment.name
                                        )}
                                    </p>

                                </div>
                            `
                            : ""
                    }

                </div>

            </div>


            <div class="detail-section">

                <button
                    type="button"
                    class="section-toggle"
                >

                    <span>
                        Client Submission
                    </span>

                    <b>
                        ▼
                    </b>

                </button>


                <div class="section-content">

                    ${createSubmissionHTML(
                        task
                    )}

                </div>

            </div>


            <div class="detail-section">

                <button
                    type="button"
                    class="section-toggle"
                >

                    <span>
                        Reminders
                    </span>

                    <b>
                        ▼
                    </b>

                </button>


                <div class="section-content">

                    ${createRemindersHTML(
                        task
                    )}

                </div>

            </div>


            <div class="detail-section">

                <button
                    type="button"
                    class="section-toggle"
                >

                    <span>
                        Submission History
                    </span>

                    <b>
                        ▼
                    </b>

                </button>


                <div class="section-content">

                    ${createHistoryHTML(
                        task
                    )}

                </div>

            </div>


        </div>

    `;


    return card;

}


async function updateTaskStatusInMongoDB(
    taskId,
    newStatus,
    feedback
) {

    if (!currentClientId) {

        throw new Error(
            "Client ID is missing."
        );

    }

    if (!taskId) {

        throw new Error(
            "Task ID is missing."
        );

    }

    let adminSession = null;

    try {

        adminSession = JSON.parse(
            sessionStorage.getItem("taskAdminSession") || localStorage.getItem("taskAdminSession") || "null"
        );

    } catch {

        adminSession = null;

    }

    if (!adminSession?.authToken) {

        throw new Error(
            "Please log out and log in again as admin before updating task status."
        );

    }

    const response =
        await fetch(
            `/api/clients/${encodeURIComponent(
                currentClientId
            )}/tasks/${encodeURIComponent(
                taskId
            )}/status`,
            {
                method:
                    "PUT",

                headers: {
                    "Content-Type":
                        "application/json",

                    Authorization:
                        `Bearer ${adminSession.authToken}`
                },

                body:
                    JSON.stringify({
                        status:
                            newStatus,

                        ...(feedback !== undefined
                            ? { feedback: feedback }
                            : {})
                    })
            }
        );


    const result =
        await response.json();


    if (
        !response.ok ||
        !result.success
    ) {

        throw new Error(
            result.message ||
            "Task status could not be updated."
        );

    }


    return result.task;

}


function updateCurrentTaskStatus(
    taskId,
    newStatus,
    feedback,
    serverTask
) {

    const task =
        currentTasks.find(
            (item) =>
                (
                    item.taskId ||
                    item.id
                ) ===
                taskId
        );

    if (!task) {

        return null;

    }

    task.status =
        newStatus;

    if (feedback !== undefined) {

        task.feedback =
            feedback;

    }

    if (Array.isArray(serverTask?.history)) {
        task.history = serverTask.history;
    }

    return task;

}


function updateTaskCardStatus(
    taskCard,
    newStatus
) {

    if (!taskCard) {

        return;

    }

    taskCard.dataset.status =
        newStatus;

    updateStatusBadge(
        taskCard,
        newStatus
    );

}


function updateCompletedUI(
    taskCard
) {

    ensureCompletedTaskDeleteControl(
        taskCard
    );

    const reviewArea =
        taskCard.querySelector(
            ".submission-review"
        );

    if (reviewArea) {

        reviewArea.innerHTML = `

            <div class="approved-message">

                <div>
                    ✓
                </div>

                <div>

                    <strong>
                        Task Completed
                    </strong>

                    <p>
                        This submission has been
                        approved and the task is
                        now completed.
                    </p>

                </div>

            </div>

        `;

    }


    const submissionSection =
        findSection(
            taskCard,
            "Client Submission"
        );

    if (submissionSection) {

        const sectionContent =
            submissionSection.querySelector(
                ".section-content"
            );

        if (sectionContent) {

            const task =
                currentTasks.find(
                    (item) =>
                        (
                            item.taskId ||
                            item.id
                        ) ===
                        taskCard.dataset.taskId
                );

            if (task) {

                sectionContent.innerHTML =
                    createSubmissionHTML(
                        task
                    );

                sectionContent
                    .querySelectorAll(
                        ".view-history-file"
                    )
                    .forEach(
                        attachHistoryFileButton
                    );

                attachDeleteCompletedTaskButton(
                    taskCard,
                    sectionContent.querySelector(
                        ".delete-completed-task"
                    )
                );

            }

        }

    }

}


function updatePendingUI(
    taskCard,
    feedback
) {

    const submissionSection =
        findSection(
            taskCard,
            "Client Submission"
        );

    if (
        submissionSection
    ) {

        const sectionContent =
            submissionSection.querySelector(
                ".section-content"
            );

        if (sectionContent) {

            sectionContent.innerHTML = `

                <div class="changes-requested">

                    <div class="changes-icon">
                        !
                    </div>

                    <div>

                        <strong>
                            Changes Requested
                        </strong>

                        <p>
                            ${escapeHTML(
                                feedback
                            )}
                        </p>

                        <small>
                            Waiting for the client
                            to submit the updated version.
                        </small>

                    </div>

                </div>

            `;

        }

    }

}


async function markTaskCompleted(
    taskCard
) {

    if (!taskCard) {

        return;

    }


    const currentStatus =
        taskCard.dataset.status;


    if (
        currentStatus !==
        "Submitted"
    ) {

        alert(
            "Only submitted tasks can be marked as completed."
        );

        return;

    }


    const taskId =
        taskCard.dataset.taskId;


    const button =
        taskCard.querySelector(
            ".mark-completed"
        );


    if (button) {

        button.disabled =
            true;

        button.textContent =
            "Updating...";

    }


    try {

        const updatedTask =
            await updateTaskStatusInMongoDB(
                taskId,
                "Completed"
            );


        updateCurrentTaskStatus(
            taskId,
            updatedTask.status ||
                "Completed",
            undefined,
            updatedTask
        );

        refreshTaskHistory(taskCard, updatedTask);


        updateTaskCardStatus(
            taskCard,
            updatedTask.status ||
                "Completed"
        );


        updateCompletedUI(
            taskCard
        );


        updateSummary();

        applyTaskFilter();


    } catch (error) {

        console.error(
            "Mark completed error:",
            error
        );


        alert(
            error.message
        );


        if (button) {

            button.disabled =
                false;

            button.textContent =
                "✓ Mark Completed";

        }

    }

}


async function requestTaskChanges(
    taskCard,
    feedback
) {

    if (!taskCard) {

        return;

    }


    const taskId =
        taskCard.dataset.taskId;


    try {

        const updatedTask =
            await updateTaskStatusInMongoDB(
                taskId,
                "Pending",
                feedback
            );


        updateCurrentTaskStatus(
            taskId,
            updatedTask.status ||
                "Pending",
            updatedTask.feedback ||
                feedback,
            updatedTask
        );

        refreshTaskHistory(taskCard, updatedTask);


        updateTaskCardStatus(
            taskCard,
            updatedTask.status ||
                "Pending"
        );


        updatePendingUI(
            taskCard,
            feedback
        );


        updateSummary();

        applyTaskFilter();


    } catch (error) {

        console.error(
            "Request changes error:",
            error
        );


        alert(
            error.message
        );

    }

}


function attachDeleteCompletedTaskButton(
    taskCard,
    deleteCompletedTaskButton
) {

    if (!deleteCompletedTaskButton) {

        return;

    }

    deleteCompletedTaskButton.addEventListener(
        "click",
        async (event) => {

            event.stopPropagation();

            const reason = window.prompt("Why are you removing this task?");
            if (reason === null) return;

            const trimmedReason = reason.trim();
            if (!trimmedReason) {
                alert("Enter a reason so the client knows why this task was removed.");
                return;
            }
            if (trimmedReason.length > 500) {
                alert("The reason must be 500 characters or fewer.");
                return;
            }

            if (!confirm(
                `Remove this task? The client will receive your reason.\n\nReason: ${trimmedReason}`
            )) {

                return;

            }

            let adminSession = null;

            try {

                adminSession = JSON.parse(
                    sessionStorage.getItem("taskAdminSession") || localStorage.getItem("taskAdminSession") || "null"
                );

            } catch {

                adminSession = null;

            }

            if (!adminSession?.authToken) {

                alert(
                    "Please log out and log in again as admin before deleting tasks."
                );

                return;

            }

            const taskId =
                taskCard.dataset.taskId;

            deleteCompletedTaskButton.disabled = true;
            deleteCompletedTaskButton.textContent = "Deleting...";

            try {

                const response =
                    await fetch(
                        `/api/clients/${encodeURIComponent(
                            currentClientId
                        )}/tasks/${encodeURIComponent(
                            taskId
                        )}`,
                        {
                            method: "DELETE",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization:
                                    `Bearer ${adminSession.authToken}`
                            },
                            body: JSON.stringify({ reason: trimmedReason })
                        }
                    );

                const data = await response.json();

                if (!response.ok || !data.success) {

                    throw new Error(
                        data.message || "Unable to delete this task."
                    );

                }

                if (data.task) {
                    currentTasks = currentTasks.map((task) =>
                        (task.taskId || task.id) === taskId ? data.task : task
                    );
                }

                renderTasks(currentTasks);
                alert(data.message || "Task removal scheduled. Its details remain visible during the 24-hour history period.");

            } catch (error) {

                console.error(
                    "Delete completed task error:",
                    error
                );

                alert(
                    error.message ||
                    "Unable to delete this task. Please try again."
                );

                deleteCompletedTaskButton.disabled = false;
                deleteCompletedTaskButton.textContent = "Remove Task";

            }

        }
    );

}

function refreshTaskHistory(taskCard, task) {
    const historyToggle = Array.from(
        taskCard.querySelectorAll(".section-toggle")
    ).find((button) => button.textContent.includes("Submission History"));
    const historyContent = historyToggle?.nextElementSibling;

    if (historyContent) {
        historyContent.innerHTML = createHistoryHTML(task);
    }
}


function ensureCompletedTaskDeleteControl(
    taskCard
) {

    if (
        !taskCard ||
        currentTasks.some((task) => (task.taskId || task.id) === taskCard.dataset.taskId && task.isDeleted) ||
        taskCard.querySelector(
            ".delete-completed-task"
        )
    ) {

        return;

    }

    const titleRow =
        taskCard.querySelector(
            ".task-title-row"
        );

    if (!titleRow) {

        return;

    }

    const deleteButton =
        document.createElement(
            "button"
        );

    deleteButton.type = "button";
    deleteButton.className = "delete-completed-task";
    deleteButton.textContent = "Remove Task";
    titleRow.appendChild(deleteButton);

    attachDeleteCompletedTaskButton(
        taskCard,
        deleteButton
    );

}


function attachTaskInteractions(
    taskCard
) {

    const extendButton = taskCard.querySelector(".extend-task-deadline");
    if (extendButton) {
        extendButton.addEventListener("click", async (event) => {
            event.stopPropagation();
            const entered = window.prompt('Enter the new deadline as YYYY-MM-DDTHH:mm (example: 2026-10-05T17:30)');
            if (!entered) return;
            const parsed = new Date(entered);
            if (!Number.isFinite(parsed.getTime())) return alert("Enter a valid date and time.");
            try {
                const response = await fetch(`/api/clients/${encodeURIComponent(currentClientId)}/tasks/${encodeURIComponent(taskCard.dataset.taskId)}/deadline`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminAuthToken()}` },
                    body: JSON.stringify({ deadline: parsed.toISOString() })
                });
                const data = await response.json();
                if (!response.ok || !data.success) throw new Error(data.message || "Could not extend deadline.");
                const index = currentTasks.findIndex((item) => item.taskId === taskCard.dataset.taskId);
                if (index >= 0) currentTasks[index] = data.task;
                renderTasks(currentTasks);
            } catch (error) {
                alert(error.message || "Could not extend deadline.");
            }
        });
    }

    attachDeleteCompletedTaskButton(
        taskCard,
        taskCard.querySelector(
            ".delete-completed-task"
        )
    );

    const header =
        taskCard.querySelector(
            "[data-task-toggle]"
        );


    if (header) {

        header.addEventListener(
            "click",
            () => {

                taskCard.classList.toggle(
                    "expanded"
                );

            }
        );

    }


    const sectionToggles =
        taskCard.querySelectorAll(
            ".section-toggle"
        );


    sectionToggles.forEach(
        (toggle) => {

            toggle.addEventListener(
                "click",
                (event) => {

                    event.stopPropagation();


                    const section =
                        toggle.closest(
                            ".detail-section"
                        );


                    if (!section) {

                        return;

                    }


                    section.classList.toggle(
                        "expanded"
                    );

                }
            );

        }
    );


    const viewFileButtons =
        taskCard.querySelectorAll(
            ".view-history-file"
        );


    viewFileButtons.forEach(
        (button) => {

            attachHistoryFileButton(
                button
            );

        }
    );


    taskCard.addEventListener(
        "click",
        async (event) => {

            const button =
                event.target.closest(
                    ".delete-reminder"
                );

            if (
                !button ||
                !taskCard.contains(button)
            ) {

                return;

            }

            const reminder =
                button.closest(
                    ".reminder-item"
                );

            const taskId =
                taskCard.dataset.taskId;

            const reminderId =
                reminder?.dataset.reminderId;

            if (
                !reminder ||
                !currentClientId ||
                !taskId ||
                !reminderId
            ) {

                alert(
                    "Unable to identify this reminder. Reload the page and try again."
                );

                return;

            }


            button.disabled = true;

            try {

                const response =
                    await fetch(
                        `/api/clients/${encodeURIComponent(
                            currentClientId
                        )}/tasks/${encodeURIComponent(
                            taskId
                        )}/reminders/${encodeURIComponent(
                            reminderId
                        )}`,
                        {
                            method: "DELETE",
                            headers: {
                                Authorization: `Bearer ${getAdminAuthToken()}`
                            }
                        }
                    );

                const data =
                    await response.json();

                if (!response.ok || !data.success) {

                    throw new Error(
                        data.message ||
                        "Unable to delete reminder."
                    );

                }

                reminder.remove();

                const remindersList =
                    taskCard.querySelector(
                        ".reminders-list"
                    );

                if (
                    remindersList &&
                    !remindersList.querySelector(
                        ".reminder-item"
                    )
                ) {

                    remindersList.innerHTML = `
                        <div class="empty-history">
                            No reminders added.
                        </div>
                    `;

                }

            } catch (error) {

                console.error(
                    "Delete reminder error:",
                    error
                );

                alert(
                    error.message ||
                    "Unable to delete reminder. Please try again."
                );

            } finally {

                button.disabled = false;

            }

        }
    );


    const addReminderButton =
        taskCard.querySelector(
            ".add-reminder-button"
        );


    if (addReminderButton) {

        addReminderButton.addEventListener(
            "click",
            () => {

                selectedReminderContainer =
                    addReminderButton
                        .closest(
                            ".detail-section"
                        )
                        ?.querySelector(
                            ".reminders-list"
                        );


                if (
                    !selectedReminderContainer
                ) {

                    return;

                }


                const reminderModal =
                    document.getElementById(
                        "reminderModal"
                    );


                const reminderDate =
                    document.getElementById(
                        "reminderDate"
                    );


                const reminderMethod =
                    document.getElementById(
                        "reminderMethod"
                    );


                if (reminderDate) {

                    reminderDate.value =
                        "";

                }


                if (reminderMethod) {

                    reminderMethod.value =
                        "both";

                }


                if (reminderModal) {

                    reminderModal.classList.add(
                        "show"
                    );

                }

            }
        );

    }


    const markCompleted =
        taskCard.querySelector(
            ".mark-completed"
        );


    if (markCompleted) {

        markCompleted.addEventListener(
            "click",
            async (event) => {

                event.stopPropagation();

                await markTaskCompleted(
                    taskCard
                );

            }
        );

    }


    const requestChanges =
        taskCard.querySelector(
            ".request-changes"
        );


    if (requestChanges) {

        requestChanges.addEventListener(
            "click",
            (event) => {

                event.stopPropagation();


                if (
                    taskCard.dataset.status !==
                    "Submitted"
                ) {

                    alert(
                        "Only submitted tasks can have changes requested."
                    );

                    return;

                }


                selectedTaskCard =
                    taskCard;


                const feedbackInput =
                    document.getElementById(
                        "feedbackInput"
                    );


                const feedbackModal =
                    document.getElementById(
                        "feedbackModal"
                    );


                if (feedbackInput) {

                    feedbackInput.value =
                        "";

                }


                if (feedbackModal) {

                    feedbackModal.classList.add(
                        "show"
                    );

                }

            }
        );

    }

}


function updateSummary() {

    let pending =
        0;

    let submitted =
        0;

    let completed =
        0;


    currentTasks.forEach(
        (task) => {

            const status =
                task.status ||
                "Pending";


            if (
                status ===
                "Pending"
            ) {

                pending++;

            }


            if (
                status ===
                "Submitted"
            ) {

                submitted++;

            }


            if (
                status ===
                "Completed"
            ) {

                completed++;

            }

        }
    );


    const total =
        currentTasks.length;


    const totalElement =
        document.getElementById(
            "totalTasks"
        );


    const pendingElement =
        document.getElementById(
            "pendingTasks"
        );


    const submittedElement =
        document.getElementById(
            "submittedTasks"
        );


    const completedElement =
        document.getElementById(
            "completedTasks"
        );


    if (totalElement) {

        totalElement.textContent =
            total;

    }


    if (pendingElement) {

        pendingElement.textContent =
            pending;

    }


    if (submittedElement) {

        submittedElement.textContent =
            submitted;

    }


    if (completedElement) {

        completedElement.textContent =
            completed;

    }

}


function applyTaskFilter() {

    if (
        !taskList ||
        !taskFilter
    ) {

        return;

    }


    const selectedStatus =
        taskFilter.value;


    const cards =
        taskList.querySelectorAll(
            ".task-card"
        );


    cards.forEach(
        (card) => {

            const status =
                card.dataset.status;


            if (
                selectedStatus ===
                    "All" ||
                status ===
                    selectedStatus
            ) {

                card.style.display =
                    "block";

            } else {

                card.style.display =
                    "none";

            }

        }
    );

}


if (taskFilter) {

    taskFilter.addEventListener(
        "change",
        applyTaskFilter
    );

}


function updateClientHeader(
    client
) {

    if (addTaskButton) {
        addTaskButton.disabled = Boolean(client.isRemoved);
        addTaskButton.hidden = Boolean(client.isRemoved);
    }

    const clientHeader =
        document.querySelector(
            ".client-header"
        );


    if (!clientHeader) {

        return;

    }

    let removalNotice = document.getElementById("clientRemovalNotice");
    if (client.isRemoved) {
        if (!removalNotice) {
            removalNotice = document.createElement("div");
            removalNotice.id = "clientRemovalNotice";
            removalNotice.className = "client-removal-notice";
            clientHeader.insertAdjacentElement("afterend", removalNotice);
        }
        removalNotice.textContent = `Client removed by ${client.removedBy || "an administrator"}. This profile and its tasks remain visible to admins for 24 hours, then move to administrator-only history. Reason: ${client.removalReason || "No reason provided"}`;
    } else {
        removalNotice?.remove();
    }


    const avatar =
        clientHeader.querySelector(
            ".client-avatar"
        );


    const heading =
        clientHeader.querySelector(
            "h1"
        );


    const designation =
        clientHeader.querySelector(
            "h1 + p"
        );


    const email =
        clientHeader.querySelector(
            "h1 + p + span"
        );


    if (avatar) {

        avatar.textContent =
            getInitial(
                client.name
            );

    }


    if (heading) {

        heading.textContent =
            client.name ||
            "Client";

    }


    if (designation) {

        designation.textContent =
            client.designation ||
            "Client";

    }


    if (email) {

        email.textContent =
            client.email ||
            "";

    }

}


function renderTasks(
    tasks
) {

    if (!taskList) {

        return;

    }


    currentTasks =
        Array.isArray(tasks)
            ? tasks
            : [];


    taskList.innerHTML =
        "";


    if (
        currentTasks.length ===
        0
    ) {

        taskList.innerHTML = `

            <div class="empty-history">
                No tasks assigned to this client.
            </div>

        `;


        updateSummary();

        return;

    }


    currentTasks.forEach(
        (task) => {

            const card =
                createTaskCard(
                    task
                );


            taskList.appendChild(
                card
            );


            attachTaskInteractions(
                card
            );

        }
    );


    updateSummary();

    applyTaskFilter();

}


async function loadClientFromMongoDB() {

    if (!currentClientId) {

        if (taskList) {

            taskList.innerHTML = `

                <div class="empty-history">
                    Client ID is missing from the URL.
                </div>

            `;

        }

        return;

    }


    if (taskList) {

        taskList.innerHTML = `

            <div class="empty-history">
                Loading client data...
            </div>

        `;

    }


    try {

        const response =
            await fetch(
                `/api/clients/${encodeURIComponent(
                    currentClientId
                )}`,
                {
                    headers: {
                        Authorization: `Bearer ${getAdminAuthToken()}`
                    }
                }
            );


        const data =
            await response.json();


        if (
            !response.ok ||
            !data.success
        ) {

            throw new Error(
                data.message ||
                "Unable to load client"
            );

        }


        currentClient =
            data.client;


        updateClientHeader(
            currentClient
        );


        renderTasks(
            currentClient.tasks
        );


        console.log(
            "Client loaded from MongoDB:",
            currentClient
        );


    } catch (error) {

        console.error(
            "Client loading error:",
            error
        );


        if (taskList) {

            taskList.innerHTML = `

                <div class="empty-history">

                    <strong>
                        Failed to load client data.
                    </strong>

                    <br><br>

                    ${escapeHTML(
                        error.message
                    )}

                </div>

            `;

        }

    }

}


/* REMINDER MODAL */

const reminderModal =
    document.getElementById(
        "reminderModal"
    );


const closeReminderModal =
    document.getElementById(
        "closeReminderModal"
    );


const closeReminderModalBottom =
    document.getElementById(
        "closeReminderModalBottom"
    );


const saveReminder =
    document.getElementById(
        "saveReminder"
    );


const reminderDate =
    document.getElementById(
        "reminderDate"
    );


const reminderMethod =
    document.getElementById(
        "reminderMethod"
    );


function closeReminder() {

    if (reminderModal) {

        reminderModal.classList.remove(
            "show"
        );

    }


    selectedReminderContainer =
        null;

}


if (closeReminderModal) {

    closeReminderModal.addEventListener(
        "click",
        closeReminder
    );

}


if (closeReminderModalBottom) {

    closeReminderModalBottom.addEventListener(
        "click",
        closeReminder
    );

}


if (saveReminder) {

    saveReminder.addEventListener(
        "click",
        async () => {

            if (
                !selectedReminderContainer
            ) {

                return;

            }


            if (
                !reminderDate ||
                !reminderDate.value
            ) {

                alert(
                    "Please select a reminder date and time."
                );

                return;

            }


            const taskCard =
                selectedReminderContainer.closest(
                    ".task-card"
                );

            const taskId =
                taskCard?.dataset.taskId;

            if (!currentClientId || !taskId) {

                alert(
                    "Unable to identify the client or task for this reminder."
                );

                return;

            }


            const originalButtonText =
                saveReminder.textContent;

            saveReminder.disabled = true;
            saveReminder.textContent = "Saving...";

            try {

                const response =
                    await fetch(
                        `/api/clients/${encodeURIComponent(
                            currentClientId
                        )}/tasks/${encodeURIComponent(
                            taskId
                        )}/reminders`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${getAdminAuthToken()}`
                            },
                            body: JSON.stringify({
                                date: new Date(reminderDate.value).toISOString(),
                                method: reminderMethod
                                    ? reminderMethod.value
                                    : "both"
                            })
                        }
                    );

                const data = await response.json();

                if (!response.ok || !data.success || !data.reminder) {

                    throw new Error(
                        data.message || "Unable to save reminder."
                    );

                }


                const savedReminder = data.reminder;

            const emptyMessage =
                selectedReminderContainer.querySelector(
                    ".empty-history"
                );


            if (emptyMessage) {

                emptyMessage.remove();

            }


            const reminder =
                document.createElement(
                    "div"
                );


                reminder.className =
                    "reminder-item";

                reminder.dataset.reminderId =
                    savedReminder.reminderId;

            reminder.dataset.reminderId =
                savedReminder.reminderId;


            reminder.innerHTML = `

                <div>

                    <strong>
                        ${escapeHTML(
                            formatReminderDate(
                                savedReminder.date
                            )
                        )}
                    </strong>

                    <span>
                        ${escapeHTML(
                            getReminderMethodText(
                                savedReminder.method
                            )
                        )}
                    </span>

                </div>

                <div class="reminder-actions">

                    <button
                        type="button"
                        class="delete-reminder"
                    >
                        Delete
                    </button>

                </div>

            `;


            selectedReminderContainer.appendChild(
                reminder
            );


            closeReminder();

            } catch (error) {

                console.error("Save reminder error:", error);

                alert(
                    error.message ||
                    "Unable to save reminder. Please try again."
                );

            } finally {

                saveReminder.disabled = false;
                saveReminder.textContent =
                    originalButtonText || "Save Reminder";

            }

        }
    );

}


/* REQUEST CHANGES MODAL */

const feedbackModal =
    document.getElementById(
        "feedbackModal"
    );


const feedbackInput =
    document.getElementById(
        "feedbackInput"
    );


const confirmFeedback =
    document.getElementById(
        "confirmFeedback"
    );


const cancelFeedback =
    document.getElementById(
        "cancelFeedback"
    );


const closeFeedbackModal =
    document.getElementById(
        "closeFeedbackModal"
    );


function closeFeedback() {

    if (feedbackModal) {

        feedbackModal.classList.remove(
            "show"
        );

    }


    selectedTaskCard =
        null;

}


if (cancelFeedback) {

    cancelFeedback.addEventListener(
        "click",
        closeFeedback
    );

}


if (closeFeedbackModal) {

    closeFeedbackModal.addEventListener(
        "click",
        closeFeedback
    );

}


if (confirmFeedback) {

    confirmFeedback.addEventListener(
        "click",
        async () => {

            if (!selectedTaskCard) {

                return;

            }


            const feedback =
                feedbackInput
                    ? feedbackInput.value.trim()
                    : "";


            if (!feedback) {

                alert(
                    "Please enter feedback before requesting changes."
                );

                return;

            }


            const taskCard =
                selectedTaskCard;


            const confirmButton =
                confirmFeedback;


            confirmButton.disabled =
                true;


            confirmButton.textContent =
                "Updating...";


            try {

                await requestTaskChanges(
                    taskCard,
                    feedback
                );


                closeFeedback();


            } catch (error) {

                console.error(
                    "Request changes confirmation error:",
                    error
                );

            } finally {

                confirmButton.disabled =
                    false;

                confirmButton.textContent =
                    "Request Changes";

            }

        }
    );

}


/* START */

if (!currentClientId) {

    alert(
        "No client ID was provided in the URL."
    );

} else {

    loadClientFromMongoDB();

    window.setInterval(async () => {
        if (document.hidden || !currentClient) return;
        try {
            const response = await fetch(`/api/clients/${encodeURIComponent(currentClientId)}`, {
                headers: { Authorization: `Bearer ${getAdminAuthToken()}` }
            });
            if (response.status === 404) {
                window.location.replace("dashboard.html");
                return;
            }
            if (!response.ok) return;
            const data = await response.json();
            if (!data.success || !data.client) return;
            const state = (items) => JSON.stringify((items || []).map((task) => [task.taskId, task.status, task.deadline, task.history?.length, task.isDeleted]));
            if (state(currentTasks) !== state(data.client.tasks)) {
                currentClient = data.client;
                renderTasks(currentClient.tasks);
            }
        } catch (error) {
            console.warn("Could not refresh task status:", error);
        }
    }, 15000);

}
