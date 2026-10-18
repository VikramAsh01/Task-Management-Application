const params = new URLSearchParams(
    window.location.search
);

const requestedClientId =
    params.get("client");

const clientSession = sessionStorage.getItem("taskClientSession") || localStorage.getItem("taskClientSession");
if (clientSession && !sessionStorage.getItem("taskClientSession")) sessionStorage.setItem("taskClientSession", clientSession);

let sessionClientId = "";
let clientAuthToken = "";

if (clientSession) {
    try {
        const parsedSession =
            JSON.parse(
                clientSession
            );

        sessionClientId =
            parsedSession.clientId ||
            parsedSession.id ||
            "";
        clientAuthToken = parsedSession.authToken || "";
    } catch {
        sessionClientId = "";
    }
}

const currentClientId =
    requestedClientId ||
    sessionClientId ||
    "";

const reminderPopupStorageKey = `taskReminderPopupSeen:${currentClientId}`;
let shownReminderPopupIds = new Set();
try {
    const savedReminderPopupIds = JSON.parse(localStorage.getItem(reminderPopupStorageKey) || "[]");
    if (Array.isArray(savedReminderPopupIds)) {
        shownReminderPopupIds = new Set(savedReminderPopupIds);
    }
} catch {
    shownReminderPopupIds = new Set();
}
let currentClient = null;
let currentTasks = [];
let clientAccessWarningShown = false;

const tasksContainer =
    document.getElementById(
        "tasksContainer"
    );

const emptyState =
    document.getElementById(
        "emptyState"
    );

const taskFilter =
    document.getElementById(
        "taskFilter"
    );


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
        undefined,
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    );

}


function getTaskId(task) {

    return (
        task.taskId ||
        task.id ||
        ""
    );

}


function getStatusClass(status) {

    if (
        status ===
        "Completed"
    ) {
        return "completed";
    }

    if (
        status ===
        "Submitted"
    ) {
        return "submitted";
    }

    if (status === "Incomplete") {
        return "incomplete";
    }

    return "pending";

}


function getStatusText(status) {

    if (!status) {
        return "Pending";
    }

    return status;

}


function getTaskCounts(tasks) {

    const counts = {

        total:
            tasks.length,

        pending: 0,

        submitted: 0,

        completed: 0

    };


    tasks.forEach(
        (task) => {

            const status =
                task.status ||
                "Pending";


            if (
                status ===
                "Pending"
            ) {
                counts.pending++;
            }


            if (
                status ===
                "Submitted"
            ) {
                counts.submitted++;
            }


            if (
                status ===
                "Completed"
            ) {
                counts.completed++;
            }

        }
    );


    return counts;

}


function updateClientInformation(
    client
) {

    if (!client) {
        return;
    }


    const name =
        client.name ||
        "Client";


    const email =
        client.email ||
        "No email available";

    const designation =
        client.designation ||
        "Client";

    renderNotifications(
        client.notifications
    );
    showReminderPopups(client.notifications);


    const initial =
        getInitial(
            name
        );


    const profileName =
        document.getElementById(
            "profileName"
        );

    const profileAvatar =
        document.getElementById(
            "profileAvatar"
        );

    const profileEmail =
        document.getElementById(
            "profileEmail"
        );

    const welcomeName =
        document.getElementById(
            "welcomeName"
        );

    const clientName =
        document.getElementById(
            "clientName"
        );

    const clientEmail =
        document.getElementById(
            "clientEmail"
        );

    const clientAvatar =
        document.getElementById(
            "clientAvatar"
        );

    const profileMenuName =
        document.getElementById(
            "profileMenuName"
        );

    const profileMenuAvatar =
        document.getElementById(
            "profileMenuAvatar"
        );

    const profileMenuEmail =
        document.getElementById(
            "profileMenuEmail"
        );

    const modalAvatar =
        document.getElementById(
            "modalAvatar"
        );

    const modalName =
        document.getElementById(
            "modalName"
        );

    const modalEmail =
        document.getElementById(
            "modalEmail"
        );

    const clientDesignation =
        document.getElementById(
            "clientDesignation"
        );

    const modalRole =
        document.getElementById(
            "modalRole"
        );


    if (profileName) {

        profileName.textContent =
            name;

    }


    if (profileAvatar) {

        profileAvatar.textContent =
            initial;

    }


    if (profileEmail) {

        profileEmail.textContent =
            email;

    }


    if (welcomeName) {

        welcomeName.textContent =
            name;

    }


    if (clientName) {

        clientName.textContent =
            name;

    }


    if (clientEmail) {

        clientEmail.textContent =
            email;

    }


    if (clientAvatar) {

        clientAvatar.textContent =
            initial;

    }

    if (profileMenuName) {

        profileMenuName.textContent =
            name;

    }

    if (profileMenuAvatar) {

        profileMenuAvatar.textContent =
            initial;

    }

    if (profileMenuEmail) {

        profileMenuEmail.textContent =
            email;

    }

    if (modalAvatar) {

        modalAvatar.textContent =
            initial;

    }

    if (modalName) {

        modalName.textContent =
            name;

    }

    if (modalEmail) {

        modalEmail.textContent =
            email;

    }

    if (clientDesignation) {

        clientDesignation.textContent =
            designation;

    }

    if (modalRole) {

        modalRole.textContent =
            designation;

    }

}


function updateTaskSummary(
    tasks
) {

    const counts =
        getTaskCounts(
            tasks
        );


    const totalTasks =
        document.getElementById(
            "totalTasks"
        );

    const pendingTasks =
        document.getElementById(
            "pendingTasks"
        );

    const submittedTasks =
        document.getElementById(
            "submittedTasks"
        );

    const completedTasks =
        document.getElementById(
            "completedTasks"
        );


    if (totalTasks) {

        totalTasks.textContent =
            counts.total;

    }


    if (pendingTasks) {

        pendingTasks.textContent =
            counts.pending;

    }


    if (submittedTasks) {

        submittedTasks.textContent =
            counts.submitted;

    }


    if (completedTasks) {

        completedTasks.textContent =
            counts.completed;

    }

}


function createAttachmentHTML(
    task
) {

    const attachment =
        task.attachment;


    if (!attachment) {

        return `
            <div class="client-detail-empty">
                No attachment provided by admin.
            </div>
        `;

    }


    const fileName =
        attachment.name ||
        attachment.fileName ||
        "Task attachment";


    const fileType =
        attachment.type ||
        "File";


    const fileSize =
        attachment.size
            ? `${attachment.size} bytes`
            : "";

    const fileDataAvailable =
        typeof attachment.fileData === "string" &&
        attachment.fileData.startsWith("data:");

    const fileTypeLower =
        String(attachment.type || "").toLowerCase();

    const canPreviewFile =
        fileTypeLower === "application/pdf" ||
        fileTypeLower === "image/jpeg" ||
        fileTypeLower === "image/png" ||
        fileTypeLower === "image/gif" ||
        fileTypeLower === "image/webp" ||
        fileTypeLower === "image/avif" ||
        fileTypeLower === "text/plain";


    return `
        <div class="client-file-box">

            <div>

                <strong>
                    ${escapeHTML(
                        fileName
                    )}
                </strong>

                <span>
                    ${escapeHTML(
                        fileType
                    )}

                    ${
                        fileSize
                            ? ` • ${escapeHTML(
                                fileSize
                            )}`
                            : ""
                    }

                </span>

            </div>

            ${
                fileDataAvailable
                    ? `
                        <div class="client-file-actions">
                            <button
                                type="button"
                                class="file-reference-button task-attachment-file-button"
                                data-attachment-action="download"
                            >
                                Download
                            </button>
                            ${
                                canPreviewFile
                                    ? `
                                        <button
                                            type="button"
                                            class="file-reference-button task-attachment-file-button"
                                            data-attachment-action="open"
                                        >
                                            Open
                                        </button>
                                    `
                                    : ""
                            }
                        </div>
                    `
                    : `
                        <small class="attachment-not-available">
                            File contents are not stored for this attachment.
                        </small>
                    `
            }

        </div>
    `;

}


function createRemindersHTML(
    task
) {

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
            <div class="client-detail-empty">
                No reminders added.
            </div>
        `;

    }


    return `
        <div class="client-reminders">

            ${reminders
                .map(
                    (
                        reminder
                    ) => {

                        const method =
                            reminder.method ||
                            "both";


                        let methodText =
                            "Email and notification";


                        if (
                            method ===
                            "email"
                        ) {

                            methodText =
                                "Email";

                        }


                        if (method === "website" || method === "notification") {

                            methodText =
                                "Website Notification";

                        }


                        return `
                            <div class="client-reminder">

                                <strong>
                                    ${escapeHTML(
                                        formatDate(
                                            reminder.date
                                        )
                                    )}
                                </strong>

                                <span>
                                    ${escapeHTML(
                                        methodText
                                    )}
                                </span>

                            </div>
                        `;

                    }
                )
                .join("")}

        </div>
    `;

}


function createSubmissionsHTML(
    task
) {

    const submissions =
        Array.isArray(
            task.submissions
        )
            ? task.submissions
            : [];


    if (
        submissions.length ===
        0
    ) {

        return `
            <div class="client-detail-empty">
                No submission has been made yet.
            </div>
        `;

    }


    return `
        <div class="client-submissions">

            ${submissions
                .map(
                    (
                        submission,
                        index
                    ) => {

                        const fileName =
                            submission.fileName ||
                            submission.name ||
                            `Submission ${
                                index + 1
                            }`;


                        const submittedAt =
                            submission.submittedAt ||
                            submission.date ||
                            "";


                        const submissionStatus =
                            submission.status ||
                            "Submitted";

                        const fileType =
                            String(
                                submission.fileType || ""
                            ).toLowerCase();

                        const canPreviewFile =
                            fileType === "application/pdf" ||
                            fileType === "image/jpeg" ||
                            fileType === "image/png" ||
                            fileType === "image/gif" ||
                            fileType === "image/webp" ||
                            fileType === "image/avif" ||
                            fileType === "text/plain";


                        return `
                            <div class="client-submission">

                                <div>

                                    <strong>
                                        ${escapeHTML(
                                            fileName
                                        )}
                                    </strong>

                                    ${
                                        submittedAt
                                            ? `
                                                <span>
                                                    ${escapeHTML(
                                                        formatDate(
                                                            submittedAt
                                                        )
                                                    )}
                                                </span>
                                            `
                                            : ""
                                    }

                                </div>

                                <div class="client-submission-actions">

                                    <span class="submission-status">
                                        ${escapeHTML(
                                            submissionStatus
                                        )}
                                    </span>

                                    <button
                                        type="button"
                                        class="client-submission-file-button"
                                        data-file-action="download"
                                        data-submission-index="${index}"
                                    >
                                        Download
                                    </button>

                                    ${
                                        canPreviewFile
                                            ? `
                                                <button
                                                    type="button"
                                                    class="client-submission-file-button"
                                                    data-file-action="open"
                                                    data-submission-index="${index}"
                                                >
                                                    Open
                                                </button>
                                            `
                                            : ""
                                    }

                                </div>

                            </div>
                        `;

                    }
                )
                .join("")}

        </div>
    `;

}


function attachSubmissionFileActions(
    card,
    task
) {

    const fileButtons =
        card.querySelectorAll(
            ".client-submission-file-button"
        );

    fileButtons.forEach(
        (button) => {

            button.addEventListener(
                "click",
                async () => {

                    const index =
                        Number(
                            button.dataset.submissionIndex
                        );

                    const submission =
                        task.submissions?.[index];

                    if (
                        !submission?.fileData ||
                        !submission.fileData.startsWith("data:")
                    ) {

                        alert(
                            "The file data is not available for this submission."
                        );

                        return;

                    }

                    const action =
                        button.dataset.fileAction;

                    let fileWindow = null;

                    if (action === "open") {

                        fileWindow =
                            window.open(
                                "about:blank",
                                "_blank"
                            );

                        if (!fileWindow) {

                            alert(
                                "Allow pop-ups for this site to open the preview, or use Download."
                            );

                            return;

                        }

                    }

                    button.disabled = true;

                    try {

                        const fileResponse =
                            await fetch(
                                submission.fileData
                            );

                        const fileBlob =
                            await fileResponse.blob();

                        const objectUrl =
                            URL.createObjectURL(
                                fileBlob
                            );

                        if (action === "open") {

                            fileWindow.location.href =
                                objectUrl;

                        } else {

                            const downloadLink =
                                document.createElement(
                                    "a"
                                );

                            downloadLink.href =
                                objectUrl;

                            downloadLink.download =
                                submission.fileName ||
                                `submission-${index + 1}`;

                            document.body.appendChild(
                                downloadLink
                            );

                            downloadLink.click();
                            downloadLink.remove();

                        }

                        window.setTimeout(
                            () => URL.revokeObjectURL(objectUrl),
                            60000
                        );

                    } catch (error) {

                        if (fileWindow) {

                            fileWindow.close();

                        }

                        console.error(
                            "Open submission file error:",
                            error
                        );

                        alert(
                            "Unable to open or download this file."
                        );

                    } finally {

                        button.disabled = false;

                    }

                }
            );

        }
    );

}


function attachTaskAttachmentActions(
    card,
    task
) {

    const buttons =
        card.querySelectorAll(
            ".task-attachment-file-button"
        );

    buttons.forEach(
        (button) => {

            button.addEventListener(
                "click",
                async () => {

                    const fileData =
                        task.attachment?.fileData;

                    if (
                        typeof fileData !== "string" ||
                        !fileData.startsWith("data:")
                    ) {

                        alert("The attachment file data is unavailable.");

                        return;

                    }

                    const action =
                        button.dataset.attachmentAction;

                    let fileWindow = null;

                    if (action === "open") {

                        fileWindow =
                            window.open("about:blank", "_blank");

                        if (!fileWindow) {

                            alert(
                                "Allow pop-ups for this site to open the preview, or use Download."
                            );

                            return;

                        }

                    }

                    button.disabled = true;

                    try {

                        const response =
                            await fetch(fileData);

                        const blob =
                            await response.blob();

                        const objectUrl =
                            URL.createObjectURL(blob);

                        if (action === "open") {

                            fileWindow.location.href = objectUrl;

                        } else {

                            const link =
                                document.createElement("a");

                            link.href = objectUrl;
                            link.download =
                                task.attachment.name || "task-attachment";

                            document.body.appendChild(link);
                            link.click();
                            link.remove();

                        }

                        window.setTimeout(
                            () => URL.revokeObjectURL(objectUrl),
                            60000
                        );

                    } catch (error) {

                        if (fileWindow) {

                            fileWindow.close();

                        }

                        console.error(
                            "Open task attachment error:",
                            error
                        );

                        alert("Unable to open or download this attachment.");

                    } finally {

                        button.disabled = false;

                    }

                }
            );

        }
    );

}


function createHistoryHTML(
    task
) {

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
            <div class="client-detail-empty">
                No previous submission history.
            </div>
        `;

    }


    return `
        <div class="client-history">

            ${history
                .map(
                    (
                        item,
                        index
                    ) => {

                        const action =
                            item.action || item.status || `Version ${index + 1}`;

                        const requestedBy =
                            item.by || (item.feedback ? "Admin" : "Client");


                        const fileName =
                            item.fileName ||
                            item.name ||
                            "";


                        const feedback =
                            item.feedback ||
                            "";


                        const date =
                            item.date ||
                            item.submittedAt ||
                            "";


                        return `
                            <div class="client-history-item">

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
                                        date
                                            ? `
                                                <small>
                                                    ${escapeHTML(
                                                        formatDate(
                                                            date
                                                        )
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
                .join("")}

        </div>
    `;

}


function createFeedbackHTML(
    task
) {

    let feedback = "";


    if (
        task.feedback
    ) {

        feedback =
            task.feedback;

    }


    if (
        !feedback &&
        Array.isArray(
            task.history
        )
    ) {

        const latest =
            task.history[
                task.history.length - 1
            ];


        if (
            latest &&
            latest.feedback
        ) {

            feedback =
                latest.feedback;

        }

    }


    if (!feedback) {

        return `
            <div class="client-detail-empty">
                No feedback from admin.
            </div>
        `;

    }


    return `
        <div class="client-feedback">
            ${escapeHTML(
                feedback
            )}
        </div>
    `;

}


function createSubmissionAreaHTML(
    task
) {

    const status =
        task.status ||
        "Pending";

    if (task.isDeleted) {
        return `
            <div class="client-incomplete-box" role="status">
                <strong>Task removed — visible during the 24-hour history period</strong>
                <p>This task and its details will remain here for 24 hours after removal, then move to administrator-only history. Uploads and task changes are disabled.</p>
                ${task.deletionReason ? `<p>Removal reason: ${escapeHTML(task.deletionReason)}</p>` : ""}
            </div>
        `;
    }


    if (
        status ===
        "Completed"
    ) {

        return `
            <div class="client-completed-box">

                <strong>
                    ✓ Task Completed
                </strong>

                <p>
                    This task has been approved by the administrator.
                </p>

            </div>
        `;

    }

    const deadlineTime = new Date(task.deadline || "").getTime();
    if (status === "Incomplete" || (Number.isFinite(deadlineTime) && deadlineTime <= Date.now())) {
        return `
            <div class="client-incomplete-box" role="status">
                <strong>Deadline passed — uploads are locked</strong>
                <p>You cannot upload a file or report until the administrator who assigned this task extends its deadline. If it is not extended, its details will move to administrator-only history 24 hours after the deadline.</p>
            </div>
        `;
    }


    if (
        status ===
        "Submitted"
    ) {

        return `
            <div class="client-submitted-box">

                <strong>
                    Submission Received
                </strong>

                <p>
                    Your submission has been sent to the administrator for review.
                </p>

            </div>
        `;

    }


    return `
        <div class="client-upload-box">

            <strong>
                Submit Your Work
            </strong>

            <p>
                Upload the completed file for this task.
            </p>

            <button
                type="button"
                class="client-upload-button"
            >
                Upload File
            </button>

            <small>
                Select one file up to 5 MB to submit this task.
            </small>

        </div>
    `;

}


function attachSubmissionUpload(
    card
) {

    const uploadButton =
        card.querySelector(
            ".client-upload-button"
        );

    if (!uploadButton) {

        return;

    }


    uploadButton.addEventListener(
        "click",
        () => {

            const fileInput =
                document.createElement(
                    "input"
                );

            fileInput.type = "file";
            fileInput.accept = "*/*";
            fileInput.hidden = true;

            fileInput.addEventListener(
                "change",
                async () => {

                    const file =
                        fileInput.files?.[0];

                    fileInput.remove();

                    if (!file) {

                        return;

                    }

                    if (file.size <= 0) {

                        alert("The selected file is empty.");

                        return;

                    }

                    if (file.size > 5 * 1024 * 1024) {

                        alert("Submission files must be 5 MB or smaller.");

                        return;

                    }

                    if (!currentClientId || !card.dataset.taskId) {

                        alert("Unable to identify this client task.");

                        return;

                    }


                    const originalButtonText =
                        uploadButton.textContent;

                    uploadButton.disabled = true;
                    uploadButton.textContent = "Uploading...";

                    try {

                        const fileData =
                            await new Promise(
                                (resolve, reject) => {

                                    const reader =
                                        new FileReader();

                                    reader.onload = () =>
                                        resolve(reader.result);

                                    reader.onerror = () =>
                                        reject(
                                            new Error("Unable to read the selected file.")
                                        );

                                    reader.readAsDataURL(file);

                                }
                            );

                        const response =
                            await fetch(
                                `/api/clients/${encodeURIComponent(
                                    currentClientId
                                )}/tasks/${encodeURIComponent(
                                    card.dataset.taskId
                                )}/submissions`,
                                {
                                    method: "POST",
                                    headers: {
                                        "Content-Type": "application/json",
                                        Authorization: `Bearer ${clientAuthToken}`
                                    },
                                    body: JSON.stringify({
                                        fileName: file.name,
                                        fileType:
                                            file.type || "application/octet-stream",
                                        fileSize: file.size,
                                        fileData: fileData
                                    })
                                }
                            );

                        const data =
                            await response.json();

                        if (
                            !response.ok ||
                            !data.success ||
                            !data.task
                        ) {

                            throw new Error(
                                data.message || "Unable to submit this file."
                            );

                        }


                        currentTasks =
                            currentTasks.map(
                                (task) =>
                                    getTaskId(task) === data.task.taskId
                                        ? data.task
                                        : task
                            );

                        renderTasks(currentTasks);

                        alert("Your file was submitted successfully.");

                    } catch (error) {

                        console.error(
                            "Submit task file error:",
                            error
                        );

                        alert(
                            error.message ||
                            "Unable to submit the file. Please try again."
                        );

                        uploadButton.disabled = false;
                        uploadButton.textContent =
                            originalButtonText || "Upload File";

                    }

                }
            );

            document.body.appendChild(fileInput);
            fileInput.click();

        }
    );

}


function createTaskCard(
    task
) {

    const taskId =
        getTaskId(
            task
        );


    const status =
        task.status ||
        "Pending";


    const statusClass =
        getStatusClass(
            status
        );

    const priority =
        task.priority || "Medium";

    const priorityClass =
        String(priority).toLowerCase();

    const deadline =
        formatDate(task.deadline);


    const card =
        document.createElement(
            "div"
        );


    card.className =
        "client-task-card";


    card.dataset.taskId =
        taskId;


    card.dataset.status =
        status;


    card.innerHTML = `

        <div
            class="client-task-header"
            data-task-toggle
        >

            <div class="client-task-heading">

                <div class="client-task-title-row">

                    <h3>
                        ${escapeHTML(
                            task.title ||
                            "Untitled Task"
                        )}
                    </h3>

                    <span
                        class="client-status-badge ${statusClass}"
                    >
                        ${escapeHTML(
                            getStatusText(
                                status
                            )
                        )}
                    </span>

                    <span class="client-priority-badge ${escapeHTML(priorityClass)}">
                        ${escapeHTML(priority)} Priority
                    </span>

                    <span class="client-deadline-badge">
                        Due: ${escapeHTML(deadline)}
                    </span>

                    ${task.isDeleted ? '<span class="client-removed-task-badge">Removed · history in 24 hours</span>' : ""}

                </div>

                <p>
                    ${escapeHTML(
                        task.description ||
                        "No task description provided."
                    )}
                </p>

            </div>

            <span class="client-task-arrow">
                ▾
            </span>

        </div>


        <div class="client-task-details">

            <div class="client-submission-area">

                ${createSubmissionAreaHTML(task)}

            </div>


            <div class="client-detail-section">

                <h4>Assigned By</h4>

                <p>${escapeHTML(task.assignedBy || "Admin")}</p>

            </div>


            <div class="client-detail-section">

                <h4>
                    Task Description
                </h4>

                <p>
                    ${escapeHTML(
                        task.description ||
                        "No task description provided."
                    )}
                </p>

            </div>


            <div class="client-detail-section">

                <h4>
                    Task Attachment
                </h4>

                ${createAttachmentHTML(
                    task
                )}

            </div>


            <div class="client-detail-section">

                <h4>
                    Reminders
                </h4>

                ${createRemindersHTML(
                    task
                )}

            </div>


            <div class="client-detail-section">

                <h4>
                    Submission
                </h4>

                ${createSubmissionsHTML(
                    task
                )}

            </div>


            <div class="client-detail-section">

                <h4>
                    Submission History
                </h4>

                ${createHistoryHTML(
                    task
                )}

            </div>


        </div>

    `;


    return card;

}


function setupTaskToggles() {

    const headers =
        document.querySelectorAll(
            "[data-task-toggle]"
        );


    headers.forEach(
        (header) => {

            header.addEventListener(
                "click",
                () => {

                    const card =
                        header.closest(
                            ".client-task-card"
                        );


                    if (!card) {
                        return;
                    }


                    card.classList.toggle(
                        "expanded"
                    );

                }
            );

        }
    );

}


function renderTasks(
    tasks
) {

    if (!tasksContainer) {
        return;
    }


    currentTasks =
        Array.isArray(
            tasks
        )
            ? tasks
            : [];

    const taskCount =
        document.getElementById(
            "taskCount"
        );

    if (taskCount) {

        taskCount.textContent =
            currentTasks.length;

    }


    tasksContainer.innerHTML =
        "";


    if (
        currentTasks.length ===
        0
    ) {

        if (emptyState) {

            emptyState.style.display =
                "block";

        }


        updateTaskSummary(
            []
        );


        return;

    }


    if (emptyState) {

        emptyState.style.display =
            "none";

    }


    currentTasks.forEach(
        (task) => {

            const card =
                createTaskCard(
                    task
                );


            tasksContainer.appendChild(
                card
            );

            attachSubmissionFileActions(
                card,
                task
            );

            attachTaskAttachmentActions(
                card,
                task
            );

            attachSubmissionUpload(
                card
            );

        }
    );


    setupTaskToggles();


    updateTaskSummary(
        currentTasks
    );


    applyTaskFilter();

}


function applyTaskFilter() {

    if (
        !tasksContainer ||
        !taskFilter
    ) {
        return;
    }


    const selectedStatus =
        taskFilter.value;


    const cards =
        tasksContainer.querySelectorAll(
            ".client-task-card"
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


async function loadClientFromMongoDB() {

    if (
        !currentClientId
    ) {

        if (tasksContainer) {

            tasksContainer.innerHTML = `

                <div class="empty-state">

                    <div class="empty-icon">
                        ⚠️
                    </div>

                    <h3>
                        Client ID missing
                    </h3>

                    <p>
                        No client was selected.
                    </p>

                </div>

            `;

        }

        return;

    }


    if (tasksContainer) {

        tasksContainer.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    ⏳
                </div>

                <h3>
                    Loading
                </h3>

                <p>
                    Loading client data from MongoDB...
                </p>

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
                        Authorization: `Bearer ${clientAuthToken}`
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


        if (
            !currentClient
        ) {

            throw new Error(
                "Client data was not returned by the server."
            );

        }


        currentTasks =
            Array.isArray(
                currentClient.tasks
            )
                ? currentClient.tasks
                : [];


        updateClientInformation(
            currentClient
        );


        renderTasks(
            currentTasks
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


        if (tasksContainer) {

            tasksContainer.innerHTML = `

                <div class="empty-state">

                    <div class="empty-icon">
                        ⚠️
                    </div>

                    <h3>
                        Failed to load client
                    </h3>

                    <p>
                        ${escapeHTML(
                            error.message
                        )}
                    </p>

                </div>

            `;

        }

    }

}


function setupProfileMenu() {

    const profileButton =
        document.getElementById(
            "profileButton"
        );

    const profileContainer =
        document.getElementById(
            "profileContainer"
        );

    const profileMenu =
        document.getElementById(
            "profileMenu"
        );


    if (
        !profileButton ||
        !profileContainer ||
        !profileMenu
    ) {

        return;

    }


    profileButton.addEventListener(
        "click",
        (event) => {

            event.stopPropagation();


            profileMenu.classList.toggle(
                "active"
            );

        }
    );


    document.addEventListener(
        "click",
        (event) => {

            if (
                !profileContainer.contains(
                    event.target
                )
            ) {

                profileMenu.classList.remove(
                    "active"
                );

            }

        }
    );

}


function setupProfileDetails() {

    const button =
        document.getElementById(
            "profileDetailsButton"
        );

    const modal =
        document.getElementById(
            "profileModal"
        );

    const closeButton =
        document.getElementById(
            "modalClose"
        );


    if (
        !button ||
        !modal
    ) {

        return;

    }


    button.addEventListener(
        "click",
        () => {

            modal.classList.add(
                "active"
            );


            const menu =
                document.getElementById(
                    "profileMenu"
                );


            if (menu) {

                menu.classList.remove(
                    "active"
                );

            }

        }
    );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            () => {

                modal.classList.remove(
                    "active"
                );

            }
        );

    }


    modal.addEventListener(
        "click",
        (event) => {

            if (
                event.target ===
                modal
            ) {

                modal.classList.remove(
                    "active"
                );

            }

        }
    );

}


function setupLogout() {

    const logoutButton =
        document.getElementById(
            "logoutButton"
        );


    if (!logoutButton) {
        return;
    }


    logoutButton.addEventListener(
        "click",
        async () => {

            const saved = sessionStorage.getItem("taskClientSession") || localStorage.getItem("taskClientSession");
            const token = JSON.parse(saved || "null")?.authToken;
            if (token) fetch("/api/logout", { method: "POST", keepalive: true, headers: { Authorization: `Bearer ${token}` } }).catch(() => {});

            sessionStorage.removeItem(
                "taskClientSession"
            );
            localStorage.removeItem("taskClientSession");


            window.location.href =
                "index.html";

        }
    );

}


function setupNotification() {

    const notificationButton =
        document.getElementById(
            "notificationButton"
        );


    const notificationPanel =
        document.getElementById(
            "notificationPanel"
        );

    if (
        !notificationButton ||
        !notificationPanel
    ) {
        return;
    }


    let notificationCount =
        document.getElementById(
            "notificationCount"
        );

    if (!notificationCount) {

        notificationCount =
            document.createElement(
                "span"
            );

        notificationCount.id =
            "notificationCount";

        notificationCount.className =
            "notification-count hidden";

        notificationButton.appendChild(
            notificationCount
        );

    }


    notificationButton.addEventListener(
        "click",
        async (event) => {

            event.stopPropagation();

            const opening =
                notificationPanel.classList.contains("hidden");

            notificationPanel.classList.toggle("hidden");

            if (opening && currentClientId) {
                try {
                    const response = await fetch(
                        `/api/clients/${encodeURIComponent(currentClientId)}/notifications/read`,
                        {
                            method: "PUT",
                            headers: {
                                Authorization: `Bearer ${clientAuthToken}`
                            }
                        }
                    );
                    if (response.ok && currentClient) {
                        currentClient.notifications = (currentClient.notifications || [])
                            .map((item) => ({ ...item, read: true }));
                        renderNotifications(currentClient.notifications);
                    }
                } catch (error) {
                    console.error("Unable to mark client notifications as read:", error);
                }
            }

        }
    );

    notificationPanel.addEventListener(
        "click",
        (event) => event.stopPropagation()
    );

    document.addEventListener(
        "click",
        () => notificationPanel.classList.add("hidden")
    );

}


function renderNotifications(
    notifications
) {

    const notificationButton =
        document.getElementById(
            "notificationButton"
        );

    const notificationPanel =
        document.getElementById(
            "notificationPanel"
        );

    if (!notificationButton || !notificationPanel) {

        return;

    }

    const list =
        Array.isArray(notifications)
            ? notifications
            : [];

    let notificationCount =
        document.getElementById(
            "notificationCount"
        );

    if (!notificationCount) {

        notificationCount =
            document.createElement(
                "span"
            );

        notificationCount.id =
            "notificationCount";

        notificationCount.className =
            "notification-count hidden";

        notificationButton.appendChild(
            notificationCount
        );

    }

    const unreadCount =
        list.filter((notification) => !notification.read).length;

    notificationCount.textContent =
        unreadCount > 99
            ? "99+"
            : String(unreadCount);

    notificationCount.classList.toggle(
        "hidden",
        unreadCount === 0
    );

    notificationPanel.innerHTML =
        list.length === 0
            ? `
                <div class="notification-panel-header">
                    Notifications
                </div>
                <div class="notification-empty">
                    No notifications yet.
                </div>
            `
            : `
                <div class="notification-panel-header">
                    Notifications
                    <span>${unreadCount}</span>
                </div>
                <div class="notification-list">
                    ${list
                        .slice()
                        .reverse()
                        .map((notification) => `
                            <div class="notification-item">
                                <p>${escapeHTML(
                                    notification.message ||
                                    "You have a new notification."
                                )}</p>
                                <time>${escapeHTML(
                                    notification.createdAt
                                        ? formatDate(notification.createdAt)
                                        : ""
                                )}</time>
                            </div>
                        `)
                        .join("")}
                </div>
            `;

}

function showReminderPopup(notification) {
    let stack = document.getElementById("reminderPopupStack");
    if (!stack) {
        stack = document.createElement("div");
        stack.id = "reminderPopupStack";
        stack.className = "reminder-popup-stack";
        stack.setAttribute("aria-live", "polite");
        document.body.appendChild(stack);
    }

    const popup = document.createElement("div");
    popup.className = "reminder-popup";
    popup.setAttribute("role", "alert");

    const icon = document.createElement("span");
    icon.className = "reminder-popup-icon";
    icon.setAttribute("aria-hidden", "true");
    const isTaskRemoved = notification.type === "task-deleted";
    const isOverdue = notification.type === "task-overdue";
    icon.textContent = isTaskRemoved ? "🗑️" : "⏰";

    const content = document.createElement("div");
    content.className = "reminder-popup-content";

    const heading = document.createElement("strong");
    heading.textContent = isTaskRemoved ? "Task removed" : isOverdue ? "Task overdue" : notification.type === "deadline-extended" ? "Deadline extended" : "Task reminder";

    const message = document.createElement("p");
    message.textContent = notification.message || "A task reminder is due.";

    content.append(heading, message);

    const closeButton = document.createElement("button");
    closeButton.className = "reminder-popup-close";
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Dismiss reminder");
    closeButton.textContent = "×";

    const dismiss = () => popup.remove();
    closeButton.addEventListener("click", dismiss);
    popup.append(icon, content, closeButton);
    stack.appendChild(popup);

    window.setTimeout(dismiss, 12000);
}

function showReminderPopups(notifications) {
    if (!Array.isArray(notifications)) return;

    notifications.forEach((notification) => {
        const notificationId = notification.notificationId;
        if (
            !["task-reminder", "task-deleted", "task-overdue", "deadline-extended"].includes(notification.type) ||
            !notificationId ||
            shownReminderPopupIds.has(notificationId)
        ) {
            return;
        }

        shownReminderPopupIds.add(notificationId);
        try {
            localStorage.setItem(
                reminderPopupStorageKey,
                JSON.stringify(Array.from(shownReminderPopupIds).slice(-100))
            );
        } catch (error) {
            console.warn("Unable to save seen reminder popups:", error);
        }
        showReminderPopup(notification);
    });
}

async function refreshClientNotifications() {
    if (!currentClientId || !clientAuthToken || document.hidden) return;

    try {
        const response = await fetch(
            `/api/clients/${encodeURIComponent(currentClientId)}`,
            { headers: { Authorization: `Bearer ${clientAuthToken}` } }
        );
        const data = await response.json();
        if (!response.ok) {
            if ([401, 403].includes(response.status) && !clientAccessWarningShown) {
                clientAccessWarningShown = true;
                sessionStorage.removeItem("taskClientSession");
                alert(data.message || "Your client account can no longer access this dashboard.");
                window.location.replace("index.html");
            }
            return;
        }
        if (!data.success || !data.client) return;

        const freshTasks = data.client.tasks || [];
        const oldTaskState = JSON.stringify((currentTasks || []).map((task) => [task.taskId, task.status, task.deadline, task.isDeleted]));
        const newTaskState = JSON.stringify(freshTasks.map((task) => [task.taskId, task.status, task.deadline, task.isDeleted]));
        if (oldTaskState !== newTaskState) {
            currentClient.tasks = freshTasks;
            currentTasks = freshTasks;
            renderTasks(currentTasks);
            updateTaskSummary(currentTasks);
        }
        currentClient.notifications = data.client.notifications || [];
        renderNotifications(currentClient.notifications);
        showReminderPopups(currentClient.notifications);
    } catch (error) {
        console.error("Unable to refresh client notifications:", error);
    }
}


function initializeClientDashboard() {

    setupProfileMenu();

    setupProfileDetails();

    setupLogout();

    setupNotification();

    loadClientFromMongoDB();

    window.setInterval(refreshClientNotifications, 15 * 1000);

}


initializeClientDashboard();
