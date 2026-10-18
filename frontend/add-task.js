const params =
    new URLSearchParams(
        window.location.search
    );

const currentClientId =
    params.get("client");

const backButton =
    document.getElementById(
        "backButton"
    );

const cancelButton =
    document.getElementById(
        "cancelButton"
    );

const taskFile =
    document.getElementById(
        "taskFile"
    );

const fileName =
    document.getElementById(
        "fileName"
    );

const addReminderButton =
    document.getElementById(
        "addReminderButton"
    );

const remindersContainer =
    document.getElementById(
        "remindersContainer"
    );

const taskForm =
    document.getElementById(
        "taskForm"
    );

const notification =
    document.getElementById(
        "notification"
    );

let currentClient = null;

function getAdminAuthToken() {
    try {
        const saved = sessionStorage.getItem("taskAdminSession") || localStorage.getItem("taskAdminSession");
        if (saved && !sessionStorage.getItem("taskAdminSession")) sessionStorage.setItem("taskAdminSession", saved);
        return JSON.parse(saved || "null")?.authToken || "";
    } catch {
        return "";
    }
}


function readFileAsDataURL(file) {

    return new Promise(
        (resolve, reject) => {

            const reader =
                new FileReader();

            reader.onload = () =>
                resolve(reader.result);

            reader.onerror = () =>
                reject(
                    new Error("Unable to read the selected attachment.")
                );

            reader.readAsDataURL(file);

        }
    );

}

function goBack() {

    if (currentClientId) {

        window.location.href =
            `client-details.html?client=${encodeURIComponent(
                currentClientId
            )}`;

    } else {

        window.location.href =
            "dashboard.html";

    }

}

if (backButton) {

    backButton.addEventListener(
        "click",
        goBack
    );

}

if (cancelButton) {

    cancelButton.addEventListener(
        "click",
        goBack
    );

}

async function loadClient() {

    if (!currentClientId) {

        alert(
            "Client information is missing. Please open Add Task from a client."
        );

        return;

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

        const result =
            await response.json();

        if (!response.ok || !result.success) {

            alert(
                result.message ||
                "Client could not be found."
            );

            return;

        }

        currentClient =
            result.client;

        updateClientInformation();

    } catch (error) {

        console.error(
            "Load client error:",
            error
        );

        alert(
            "Unable to connect to the server."
        );

    }

}

function updateClientInformation() {

    if (!currentClient) {

        return;

    }

    const clientNameElements =
        document.querySelectorAll(
            "#clientName, .client-name"
        );

    clientNameElements.forEach(
        (element) => {

            element.textContent =
                currentClient.name ||
                "Client";

        }
    );

    const designationElements =
        document.querySelectorAll(
            "#clientDesignation, .client-designation"
        );

    designationElements.forEach(
        (element) => {

            element.textContent =
                currentClient.designation ||
                "Client";

        }
    );

    const emailElements =
        document.querySelectorAll(
            "#clientEmail, .client-email"
        );

    emailElements.forEach(
        (element) => {

            element.textContent =
                currentClient.email ||
                "";

        }
    );

    const phoneElements =
        document.querySelectorAll(
            "#clientPhone, .client-phone"
        );

    phoneElements.forEach(
        (element) => {

            element.textContent =
                currentClient.phone ||
                "";

        }
    );

    const avatarElements =
        document.querySelectorAll(
            "#clientAvatar, .client-avatar"
        );

    avatarElements.forEach(
        (element) => {

            element.textContent =
                currentClient.name
                    ? currentClient.name
                        .charAt(0)
                        .toUpperCase()
                    : "?";

        }
    );

}

if (taskFile) {

    taskFile.addEventListener(
        "change",
        () => {

            if (
                taskFile.files.length >
                0
            ) {

                fileName.textContent =
                    taskFile.files[0].name;

            } else {

                fileName.textContent =
                    "No file selected";

            }

        }
    );

}

function addReminder() {

    if (!remindersContainer) {

        return;

    }

    const reminderNumber =
        remindersContainer
            .children
            .length + 1;

    const reminderCard =
        document.createElement(
            "div"
        );

    reminderCard.className =
        "reminder-card";

    reminderCard.innerHTML = `

        <div class="reminder-header">

            <span class="reminder-title">
                Reminder ${reminderNumber}
            </span>

            <button
                type="button"
                class="delete-reminder"
            >
                Delete
            </button>

        </div>

        <div class="form-row">

            <div class="form-group">

                <label>
                    Reminder Date & Time
                </label>

                <input
                    type="datetime-local"
                    class="reminder-date"
                >

            </div>

            <div class="form-group">

                <label>
                    Reminder Method
                </label>

                <select
                    class="reminder-method"
                >

                    <option value="both">
                        Website + Email
                    </option>

                    <option value="website">
                        Website Notification
                    </option>

                    <option value="email">
                        Email
                    </option>

                </select>

            </div>

        </div>

    `;

    remindersContainer.appendChild(
        reminderCard
    );

    const deleteButton =
        reminderCard.querySelector(
            ".delete-reminder"
        );

    deleteButton.addEventListener(
        "click",
        () => {

            reminderCard.remove();

            updateReminderNumbers();

        }
    );

}

function updateReminderNumbers() {

    if (!remindersContainer) {

        return;

    }

    const reminders =
        remindersContainer.querySelectorAll(
            ".reminder-card"
        );

    reminders.forEach(
        (reminder, index) => {

            const title =
                reminder.querySelector(
                    ".reminder-title"
                );

            if (title) {

                title.textContent =
                    `Reminder ${index + 1}`;

            }

        }
    );

}

if (addReminderButton) {

    addReminderButton.addEventListener(
        "click",
        addReminder
    );

}

function getReminders() {

    const reminders = [];

    if (!remindersContainer) {

        return reminders;

    }

    const reminderCards =
        remindersContainer.querySelectorAll(
            ".reminder-card"
        );

    reminderCards.forEach(
        (card) => {

            const dateInput =
                card.querySelector(
                    ".reminder-date"
                );

            const methodInput =
                card.querySelector(
                    ".reminder-method"
                );

            const date =
                dateInput
                    ? dateInput.value
                    : "";

            const method =
                methodInput
                    ? methodInput.value
                    : "both";

            if (date) {

                reminders.push({

                    reminderId:
                        `reminder-${Date.now()}-${Math.random()
                            .toString(36)
                            .slice(2, 8)}`,

                    date:
                        new Date(date).toISOString(),

                    method:
                        method

                });

            }

        }
    );

    return reminders;

}

if (taskForm) {

    taskForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            if (!currentClientId) {

                alert(
                    "Client information is missing. Please open Add Task from a client."
                );

                return;

            }

            if (!currentClient) {

                alert(
                    "Client information is not loaded yet."
                );

                return;

            }

            const taskTitleElement =
                document.getElementById(
                    "taskTitle"
                );

            const taskDescriptionElement =
                document.getElementById(
                    "taskDescription"
                );

            const priorityElement =
                document.getElementById(
                    "priority"
                );

            const deadlineElement =
                document.getElementById(
                    "deadline"
                );

            const taskTitle =
                taskTitleElement
                    ? taskTitleElement.value.trim()
                    : "";

            const taskDescription =
                taskDescriptionElement
                    ? taskDescriptionElement.value.trim()
                    : "";

            const priority =
                priorityElement
                    ? priorityElement.value
                    : "Medium";

            const deadline =
                deadlineElement
                    ? deadlineElement.value
                    : "";

            if (!taskTitle) {

                alert(
                    "Please enter a task title."
                );

                return;

            }

            if (!taskDescription) {

                alert(
                    "Please enter a task description."
                );

                return;

            }

            const selectedFile =
                taskFile &&
                taskFile.files.length >
                0
                    ? taskFile.files[0]
                    : null;

            if (
                selectedFile &&
                selectedFile.size > 5 * 1024 * 1024
            ) {

                alert("Task attachments must be 5 MB or smaller.");

                return;

            }

            let attachmentData = "";

            if (selectedFile) {

                try {

                    attachmentData =
                        await readFileAsDataURL(
                            selectedFile
                        );

                } catch (error) {

                    alert(
                        error.message ||
                        "Unable to read the selected attachment."
                    );

                    return;

                }

            }

            const attachment =
                selectedFile
                    ? {

                        name:
                            selectedFile.name,

                        type:
                            selectedFile.type,

                        size:
                            selectedFile.size,

                        fileData:
                            attachmentData

                    }
                    : {

                        name: "",
                        type: "",
                        size: 0,
                        fileData: ""

                    };

            const reminders =
                getReminders();

            const taskData = {

                title:
                    taskTitle,

                description:
                    taskDescription,

                priority:
                    priority,

                deadline:
                    deadline,

                status:
                    "Pending",

                assignedBy:
                    "Admin",

                attachment:
                    attachment,

                reminders:
                    reminders,

                submissions:
                    [],

                history:
                    []

            };

            try {

                const response =
                    await fetch(
                        `/api/clients/${encodeURIComponent(
                            currentClientId
                        )}/tasks`,
                        {

                            method:
                                "POST",

                            headers: {

                                "Content-Type":
                                    "application/json",
                                Authorization: `Bearer ${getAdminAuthToken()}`

                            },

                            body:
                                JSON.stringify(
                                    taskData
                                )

                        }
                    );

                const result =
                    await response.json();

                if (!response.ok || !result.success) {

                    alert(
                        result.message ||
                        "Task could not be created."
                    );

                    return;

                }

                alert(
                    `Task "${taskTitle}" has been created successfully.`
                );

                window.location.href =
                    `client-details.html?client=${encodeURIComponent(
                        currentClientId
                    )}`;

            } catch (error) {

                console.error(
                    "Create task error:",
                    error
                );

                alert(
                    "Unable to connect to the server. Please make sure the backend is running."
                );

            }

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

loadClient();
