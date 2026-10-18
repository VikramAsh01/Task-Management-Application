const backButton =
    document.getElementById("backButton");

backButton.addEventListener("click", () => {
    window.location.href = "client-details.html";
});


const notification =
    document.getElementById("notification");

notification.addEventListener("click", () => {
    alert("Notifications will be connected later.");
});


const downloadButton =
    document.getElementById("downloadButton");

downloadButton.addEventListener("click", () => {
    alert("Task attachment viewing will be connected later.");
});


/* SUBMISSION */

const taskStatus =
    document.getElementById("taskStatus");

const submissionStatus =
    document.getElementById("submissionStatus");

const submissionPending =
    document.getElementById("submissionPending");

const submissionContent =
    document.getElementById("submissionContent");

const submissionCompleted =
    document.getElementById("submissionCompleted");

const sideStatus =
    document.getElementById("sideStatus");

const sideSubmissionStatus =
    document.getElementById("sideSubmissionStatus");

const markCompleted =
    document.getElementById("markCompleted");

const requestChanges =
    document.getElementById("requestChanges");

const completedDate =
    document.getElementById("completedDate");

const openSubmittedFile =
    document.getElementById("openSubmittedFile");


let currentStatus = "Submitted";


function showPending() {

    currentStatus = "Pending";

    taskStatus.textContent = "Pending";
    taskStatus.className =
        "status-badge pending";

    submissionStatus.textContent = "Pending";
    submissionStatus.className =
        "submission-status pending";

    submissionPending.style.display = "block";

    submissionContent.style.display = "none";

    submissionCompleted.style.display = "none";

    sideStatus.textContent = "Pending";

    sideSubmissionStatus.textContent =
        "Not Submitted";

}


function showSubmitted() {

    currentStatus = "Submitted";

    taskStatus.textContent = "Submitted";
    taskStatus.className =
        "status-badge submitted";

    submissionStatus.textContent = "Submitted";
    submissionStatus.className =
        "submission-status submitted";

    submissionPending.style.display = "none";

    submissionContent.style.display = "block";

    submissionCompleted.style.display = "none";

    sideStatus.textContent = "Submitted";

    sideSubmissionStatus.textContent =
        "Submitted";

}


function showCompleted() {

    currentStatus = "Completed";

    taskStatus.textContent = "Completed";
    taskStatus.className =
        "status-badge completed";

    submissionStatus.textContent = "Completed";
    submissionStatus.className =
        "submission-status completed";

    submissionPending.style.display = "none";

    submissionContent.style.display = "none";

    submissionCompleted.style.display = "block";

    sideStatus.textContent = "Completed";

    sideSubmissionStatus.textContent =
        "Completed";

    completedDate.textContent =
        formatDate(new Date());

}


openSubmittedFile.addEventListener("click", () => {

    alert(
        "The current submitted file will open here when file storage is connected."
    );

});


markCompleted.addEventListener("click", () => {

    if (currentStatus !== "Submitted") {

        alert(
            "The task can only be completed after a client submission."
        );

        return;

    }

    const confirmed =
        confirm(
            "Have you reviewed the client's latest submission and want to mark this task as completed?"
        );

    if (!confirmed) {
        return;
    }

    showCompleted();

});


/* REQUEST CHANGES */

const feedbackModal =
    document.getElementById("feedbackModal");

const closeFeedbackModal =
    document.getElementById("closeFeedbackModal");

const cancelFeedback =
    document.getElementById("cancelFeedback");

const sendFeedback =
    document.getElementById("sendFeedback");

const adminFeedback =
    document.getElementById("adminFeedback");


function openFeedbackModal() {

    if (currentStatus !== "Submitted") {
        return;
    }

    adminFeedback.value = "";

    feedbackModal.classList.add("show");

}


function closeFeedback() {

    feedbackModal.classList.remove("show");

}


requestChanges.addEventListener("click", () => {

    openFeedbackModal();

});


closeFeedbackModal.addEventListener("click", () => {

    closeFeedback();

});


cancelFeedback.addEventListener("click", () => {

    closeFeedback();

});


feedbackModal.addEventListener("click", (event) => {

    if (event.target === feedbackModal) {
        closeFeedback();
    }

});


sendFeedback.addEventListener("click", () => {

    const feedback =
        adminFeedback.value.trim();


    if (!feedback) {

        alert(
            "Please explain what changes are required before sending the request."
        );

        adminFeedback.focus();

        return;

    }


    addSubmissionHistoryItem(
        feedback
    );


    showPending();

    closeFeedback();


    alert(
        "Changes have been requested. The client's previous submission has been kept in the submission history."
    );

});


/* SUBMISSION HISTORY */

const historyContainer =
    document.getElementById("historyContainer");


function addSubmissionHistoryItem(feedback) {

    const existingItems =
        historyContainer.querySelectorAll(
            ".history-item"
        );

    const version =
        existingItems.length + 1;


    const historyItem =
        document.createElement("div");

    historyItem.className =
        "history-item";

    historyItem.dataset.version =
        version;


    historyItem.innerHTML = `

        <div class="history-header">

            <div>

                <span class="version-label">
                    Version ${version}
                </span>

                <strong>
                    ${formatDate(new Date())}
                </strong>

            </div>

            <span class="history-status changes">
                Changes Requested
            </span>

        </div>


        <div class="history-report">

            <h4>
                Client Report
            </h4>

            <p>
                Previous client submission.
            </p>

        </div>


        <div class="history-file">

            <span class="file-icon">
                📄
            </span>

            <div>

                <strong>
                    Previous_Submission_V${version}.pdf
                </strong>

                <p>
                    Previous submission
                </p>

            </div>

            <button
                class="history-file-button"
            >
                Open File
            </button>

        </div>


        <div class="feedback-box">

            <span>
                Admin Feedback
            </span>

            <p>
                ${feedback}
            </p>

        </div>

    `;


    historyContainer.insertBefore(
        historyItem,
        historyContainer.firstChild
    );


    const openFileButton =
        historyItem.querySelector(
            ".history-file-button"
        );


    openFileButton.addEventListener(
        "click",
        () => {

            alert(
                "This previous submitted file will remain available for review when file storage is connected."
            );

        }
    );

}


/* REMINDERS */

const addReminderButton =
    document.getElementById("addReminderButton");

const remindersContainer =
    document.getElementById("remindersContainer");

const noReminders =
    document.getElementById("noReminders");

const reminderModal =
    document.getElementById("reminderModal");

const modalTitle =
    document.getElementById("modalTitle");

const closeModal =
    document.getElementById("closeModal");

const cancelModal =
    document.getElementById("cancelModal");

const saveReminder =
    document.getElementById("saveReminder");

const reminderDate =
    document.getElementById("reminderDate");

const reminderMethod =
    document.getElementById("reminderMethod");


let editingReminder = null;


function openAddReminder() {

    editingReminder = null;

    modalTitle.textContent =
        "Add Reminder";

    reminderDate.value = "";

    reminderMethod.value = "both";

    reminderModal.classList.add("show");

}


function openEditReminder(reminder) {

    editingReminder = reminder;

    const date =
        reminder.dataset.date || "";

    const method =
        reminder.dataset.method || "both";

    modalTitle.textContent =
        "Edit Reminder";

    reminderDate.value = date;

    reminderMethod.value = method;

    reminderModal.classList.add("show");

}


function closeReminderModal() {

    reminderModal.classList.remove("show");

    editingReminder = null;

}


function createReminder(date, method) {

    const reminder =
        document.createElement("div");

    reminder.className =
        "existing-reminder";

    reminder.dataset.date = date;

    reminder.dataset.method = method;


    reminder.innerHTML = `

        <div class="reminder-number">
            1
        </div>

        <div class="reminder-info">

            <strong>
                ${formatDate(date)}
            </strong>

            <span>
                ${getMethodName(method)}
            </span>

        </div>

        <div class="reminder-actions">

            <button
                class="edit-reminder"
            >
                Edit
            </button>

            <button
                class="delete-reminder"
            >
                Delete
            </button>

        </div>

    `;


    remindersContainer.appendChild(
        reminder
    );


    attachReminderEvents(
        reminder
    );


    updateReminderNumbers();

    updateReminderVisibility();

}


function attachReminderEvents(reminder) {

    const editButton =
        reminder.querySelector(
            ".edit-reminder"
        );

    const deleteButton =
        reminder.querySelector(
            ".delete-reminder"
        );


    editButton.addEventListener(
        "click",
        () => {

            openEditReminder(
                reminder
            );

        }
    );


    deleteButton.addEventListener(
        "click",
        () => {

            const confirmed =
                confirm(
                    "Delete this reminder?"
                );

            if (!confirmed) {
                return;
            }

            reminder.remove();

            updateReminderNumbers();

            updateReminderVisibility();

        }
    );

}


function updateReminderNumbers() {

    const reminders =
        remindersContainer.querySelectorAll(
            ".existing-reminder"
        );


    reminders.forEach(
        (reminder, index) => {

            const number =
                reminder.querySelector(
                    ".reminder-number"
                );

            number.textContent =
                index + 1;

        }
    );

}


function updateReminderVisibility() {

    const reminders =
        remindersContainer.querySelectorAll(
            ".existing-reminder"
        );


    if (reminders.length === 0) {

        noReminders.style.display =
            "block";

    } else {

        noReminders.style.display =
            "none";

    }

}


function getMethodName(method) {

    if (method === "website") {
        return "Website Notification";
    }

    if (method === "email") {
        return "Email";
    }

    return "Website + Email";

}


function formatDate(dateValue) {

    if (!dateValue) {
        return "No date selected";
    }


    const date =
        dateValue instanceof Date
            ? dateValue
            : new Date(dateValue);


    if (isNaN(date.getTime())) {
        return dateValue;
    }


    return date.toLocaleString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


addReminderButton.addEventListener(
    "click",
    () => {

        openAddReminder();

    }
);


saveReminder.addEventListener(
    "click",
    () => {

        if (!reminderDate.value) {

            alert(
                "Please select a reminder date and time."
            );

            return;

        }


        if (editingReminder) {

            editingReminder.dataset.date =
                reminderDate.value;

            editingReminder.dataset.method =
                reminderMethod.value;


            const reminderInfo =
                editingReminder.querySelector(
                    ".reminder-info"
                );


            reminderInfo.querySelector(
                "strong"
            ).textContent =
                formatDate(
                    reminderDate.value
                );


            reminderInfo.querySelector(
                "span"
            ).textContent =
                getMethodName(
                    reminderMethod.value
                );


            alert(
                "Reminder updated successfully."
            );

        } else {

            createReminder(
                reminderDate.value,
                reminderMethod.value
            );


            alert(
                "Reminder added successfully."
            );

        }


        closeReminderModal();

    }
);


closeModal.addEventListener(
    "click",
    () => {

        closeReminderModal();

    }
);


cancelModal.addEventListener(
    "click",
    () => {

        closeReminderModal();

    }
);


reminderModal.addEventListener(
    "click",
    (event) => {

        if (event.target === reminderModal) {

            closeReminderModal();

        }

    }
);


const existingReminders =
    remindersContainer.querySelectorAll(
        ".existing-reminder"
    );


existingReminders.forEach(
    (reminder) => {

        const reminderNumber =
            reminder.dataset.reminder;


        if (reminderNumber === "1") {

            reminder.dataset.date =
                "2026-09-23T10:00";

            reminder.dataset.method =
                "both";

        }


        if (reminderNumber === "2") {

            reminder.dataset.date =
                "2026-09-24T10:00";

            reminder.dataset.method =
                "email";

        }


        attachReminderEvents(
            reminder
        );

    }
);


updateReminderVisibility();