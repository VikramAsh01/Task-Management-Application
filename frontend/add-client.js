const clientForm = document.getElementById("clientForm");

const backButton = document.getElementById("backButton");
const cancelButton = document.getElementById("cancelButton");

const taskFile = document.getElementById("taskFile");
const fileName = document.getElementById("fileName");

const addReminderButton =
    document.getElementById("addReminderButton");

const remindersContainer =
    document.getElementById("remindersContainer");

function getAdminAuthToken() {
    try {
        return JSON.parse(sessionStorage.getItem("taskAdminSession") || "null")?.authToken || "";
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


backButton.addEventListener("click", () => {
    window.location.href = "dashboard.html";
});


cancelButton.addEventListener("click", () => {
    window.location.href = "dashboard.html";
});


taskFile.addEventListener("change", () => {

    if (taskFile.files.length > 0) {

        fileName.textContent =
            taskFile.files[0].name;

    } else {

        fileName.textContent =
            "No file selected";

    }

});


function createId(prefix) {

    return `${prefix}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

}


function addReminder() {

    const reminderNumber =
        remindersContainer.children.length + 1;


    const reminderCard =
        document.createElement("div");


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

                <select class="reminder-method">

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


            title.textContent =
                `Reminder ${index + 1}`;

        }
    );

}


addReminderButton.addEventListener(
    "click",
    () => {

        addReminder();

    }
);


function getReminders() {

    const reminders = [];


    const reminderCards =
        remindersContainer.querySelectorAll(
            ".reminder-card"
        );


    reminderCards.forEach(
        (card) => {

            const date =
                card.querySelector(
                    ".reminder-date"
                ).value;


            const method =
                card.querySelector(
                    ".reminder-method"
                ).value;


            if (date) {

                reminders.push({

                    reminderId:
                        createId("reminder"),

                    date:
                        date,

                    method:
                        method

                });

            }

        }
    );


    return reminders;

}


clientForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        const clientName =
            document.getElementById(
                "clientName"
            ).value.trim();


        const phone =
            document.getElementById(
                "phone"
            ).value.trim();


        const designation =
            document.getElementById(
                "designation"
            ).value.trim();


        const email =
            document.getElementById(
                "email"
            ).value.trim();


        const taskTitle =
            document.getElementById(
                "taskTitle"
            ).value.trim();


        const taskDescription =
            document.getElementById(
                "taskDescription"
            ).value.trim();


        const priority =
            document.getElementById(
                "priority"
            ).value;


        const deadline =
            document.getElementById(
                "deadline"
            ).value;


        const selectedFile =
            taskFile.files.length > 0
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


        const taskId =
            createId("task");


        const task = {

            taskId:
                taskId,

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

                    },

            reminders:
                getReminders(),

            submissions: [],

            feedback:
                "",

            history: []

        };


        const client = {

            name:
                clientName,

            phone:
                phone,

            designation:
                designation,

            email:
                email,

            tasks:
                [task]

        };


        try {

            const response =
                await fetch(
                    "/api/clients",
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
                                client
                            )

                    }
                );


            const result =
                await response.json();


            if (!response.ok) {

                alert(
                    result.message ||
                    "Failed to create client."
                );

                return;

            }


            alert(
                `${clientName} has been added successfully.`
            );


            window.location.href =
                "dashboard.html";


        } catch (error) {

            console.error(
                "Create client error:",
                error
            );


            alert(
                "Unable to connect to the server. Please make sure the backend server is running."
            );

        }

    }
);


const notification =
    document.getElementById(
        "notification"
    );


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
