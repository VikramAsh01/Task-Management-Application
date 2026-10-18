const API_URL = "/api";

let clients = [];


function getTaskCounts(tasks) {

    const counts = {
        total: tasks.length,
        pending: 0,
        submitted: 0,
        completed: 0
    };


    tasks.forEach((task) => {

        if (task.status === "Pending") {
            counts.pending++;
        }

        if (task.status === "Submitted") {
            counts.submitted++;
        }

        if (task.status === "Completed") {
            counts.completed++;
        }

    });


    return counts;

}


function updateOverallSummary(clients) {

    const allTasks = [];


    clients.forEach((client) => {

        const clientTasks =
            Array.isArray(client.tasks)
                ? client.tasks
                : [];


        clientTasks.forEach((task) => {

            allTasks.push(task);

        });

    });


    const counts =
        getTaskCounts(allTasks);


    document.getElementById(
        "totalTasks"
    ).textContent =
        counts.total;


    document.getElementById(
        "pendingTasks"
    ).textContent =
        counts.pending;


    document.getElementById(
        "submittedTasks"
    ).textContent =
        counts.submitted;


    document.getElementById(
        "completedTasks"
    ).textContent =
        counts.completed;

}


function getInitial(name) {

    if (!name) {
        return "?";
    }


    return name
        .charAt(0)
        .toUpperCase();

}


function createClientCard(client) {

    const tasks =
        Array.isArray(client.tasks)
            ? client.tasks
            : [];


    const counts =
        getTaskCounts(tasks);


    const card =
        document.createElement("div");


    card.className =
        client.isRemoved ? "client-card client-card-removed" : "client-card";


    card.dataset.client =
        (client.name || "")
            .toLowerCase();


    card.innerHTML = `

        <div class="client-info">

            <div class="client-avatar">
                ${getInitial(client.name)}
            </div>

            <div>

                <p class="client-name">
                    ${client.name || "Unknown Client"}
                </p>

                <p class="client-designation">
                    ${client.designation || ""}
                </p>

                <p class="client-email">
                    ${client.email || ""}
                </p>

                ${client.isRemoved ? `
                    <span class="client-removed-badge">Removed</span>
                    <p class="client-removal-reason"></p>
                ` : ""}

            </div>

        </div>


        <div class="task-stats">

            <div class="task-stat total">

                <span class="task-stat-label">
                    Total
                </span>

                <span class="task-stat-number">
                    ${counts.total}
                </span>

            </div>


            <div class="task-stat pending">

                <span class="task-stat-label">
                    Pending
                </span>

                <span class="task-stat-number">
                    ${counts.pending}
                </span>

            </div>


            <div class="task-stat submitted">

                <span class="task-stat-label">
                    Submitted
                </span>

                <span class="task-stat-number">
                    ${counts.submitted}
                </span>

            </div>


            <div class="task-stat completed">

                <span class="task-stat-label">
                    Completed
                </span>

                <span class="task-stat-number">
                    ${counts.completed}
                </span>

            </div>

        </div>


        <button
            class="view-client"
            data-client-id="${client.clientId}"
        >
            View Client →
        </button>

        ${client.isRemoved ? `
            <button class="client-removed-button" type="button" disabled>Client Removed</button>
        ` : `
            <button class="remove-client" type="button" data-client-id="${client.clientId}">Remove Client</button>
        `}

    `;


    if (client.isRemoved) {
        card.querySelector(".client-removal-reason").textContent =
            `Removed by ${client.removedBy || "an administrator"}. Profile and task details remain visible here for 24 hours, then move to administrator-only history. Reason: ${client.removalReason || "No reason provided"}`;
    }

    return card;

}


async function renderClients() {

    const clientList =
        document.getElementById(
            "clientList"
        );


    clientList.innerHTML = `
        <p>Loading clients...</p>
    `;


    try {

        const response =
            await fetch(
                `${API_URL}/clients`,
                {
                    headers: {
                        Authorization: `Bearer ${getAdminSession().authToken || ""}`
                    }
                }
            );


        const result =
            await response.json();


        if (!response.ok || !result.success) {

            throw new Error(
                result.message ||
                "Failed to load clients"
            );

        }


        clients =
            Array.isArray(result.clients)
                ? result.clients
                : [];


        clientList.innerHTML = "";


        if (clients.length === 0) {

            clientList.innerHTML = `
                <p>No clients found.</p>
            `;

        } else {

            clients.forEach((client) => {

                const card =
                    createClientCard(client);


                clientList.appendChild(card);

            });

        }


        updateOverallSummary(
            clients
        );


        setupViewButtons();
        setupRemoveClientButtons();

        applySearch();


    } catch (error) {

        console.error(
            "Load clients error:",
            error
        );


        clientList.innerHTML = `
            <p>
                Unable to load clients.
                Please make sure the server is running.
            </p>
        `;


        updateOverallSummary([]);

    }

}


function setupViewButtons() {

    const viewButtons =
        document.querySelectorAll(
            ".view-client"
        );


    viewButtons.forEach((button) => {

        button.addEventListener(
            "click",
            () => {

                const clientId =
                    button.dataset.clientId;


                if (!clientId) {

                    alert(
                        "Client ID is missing."
                    );

                    return;

                }


                window.location.href =
                    `client-details.html?client=${encodeURIComponent(clientId)}`;

            }
        );

    });

}

function setupRemoveClientButtons() {
    document.querySelectorAll(".remove-client").forEach((button) => {
        button.addEventListener("click", async () => {
            const reason = window.prompt("Why are you removing this client?");
            if (reason === null) return;

            const trimmedReason = reason.trim();
            if (!trimmedReason) {
                alert("Enter a reason so the client knows why access was removed.");
                return;
            }
            if (trimmedReason.length > 500) {
                alert("The reason must be 500 characters or fewer.");
                return;
            }
            if (!confirm(`Remove this client? They will not be able to log in.\n\nReason: ${trimmedReason}`)) {
                return;
            }

            const adminSession = getAdminSession();
            if (!adminSession.authToken) {
                alert("Please log out and log in again as admin before removing a client.");
                return;
            }

            button.disabled = true;
            button.textContent = "Removing...";
            try {
                const response = await fetch(
                    `${API_URL}/clients/${encodeURIComponent(button.dataset.clientId)}`,
                    {
                        method: "DELETE",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${adminSession.authToken}`
                        },
                        body: JSON.stringify({ reason: trimmedReason })
                    }
                );
                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.message || "Unable to remove this client.");
                }

                alert(result.message);
                await renderClients();
            } catch (error) {
                alert(error.message || "Unable to remove this client.");
                button.disabled = false;
                button.textContent = "Remove Client";
            }
        });
    });
}


const searchClient =
    document.getElementById(
        "searchClient"
    );


function applySearch() {

    if (!searchClient) {
        return;
    }


    const searchValue =
        searchClient.value
            .toLowerCase()
            .trim();


    const clientCards =
        document.querySelectorAll(
            ".client-card"
        );


    let visibleClients = 0;


    clientCards.forEach((card) => {

        const clientName =
            card.dataset.client;


        if (
            clientName.includes(
                searchValue
            )
        ) {

            card.style.display =
                "grid";

            visibleClients++;

        } else {

            card.style.display =
                "none";

        }

    });


    const noResults =
        document.getElementById(
            "noResults"
        );


    if (!noResults) {
        return;
    }


    if (visibleClients === 0) {

        noResults.style.display =
            "block";

    } else {

        noResults.style.display =
            "none";

    }

}


if (searchClient) {

    searchClient.addEventListener(
        "input",
        applySearch
    );

}


const addClientButton =
    document.getElementById(
        "addClientButton"
    );


if (addClientButton) {

    addClientButton.addEventListener(
        "click",
        () => {

            window.location.href =
                "add-client.html";

        }
    );

}


const profileContainer =
    document.getElementById(
        "profileContainer"
    );


const adminProfile =
    document.getElementById(
        "adminProfile"
    );


const logoutButton =
    document.getElementById(
        "logoutButton"
    );


const profileAvatar =
    document.getElementById(
        "profileAvatar"
    );


const profileMenuName =
    document.getElementById(
        "profileMenuName"
    );


const profileMenuAvatar =
    document.getElementById(
        "profileMenuAvatar"
    );


const profileMenuUsername =
    document.getElementById(
        "profileMenuUsername"
    );


function getAdminSession() {

    const savedSession = sessionStorage.getItem("taskAdminSession") || localStorage.getItem("taskAdminSession");
    if (savedSession && !sessionStorage.getItem("taskAdminSession")) sessionStorage.setItem("taskAdminSession", savedSession);


    if (!savedSession) {

        return {
            username: "Admin",
            loginMethod:
                "Username / Password"
        };

    }


    try {

        return JSON.parse(
            savedSession
        );

    } catch {

        return {
            username: "Admin",
            loginMethod:
                "Username / Password"
        };

    }

}


function updateAdminProfile() {

    const admin =
        getAdminSession();


    const username =
        admin.username ||
        admin.name ||
        "Admin";

    const email =
        admin.email ||
        "";


    const initial =
        username
            .charAt(0)
            .toUpperCase();


    const adminName =
        document.getElementById(
            "adminName"
        );


    if (adminName) {

        adminName.textContent =
            username;

    }


    if (profileAvatar) {

        profileAvatar.textContent =
            initial;

    }


    if (profileMenuName) {

        profileMenuName.textContent =
            username;

    }


    if (profileMenuAvatar) {

        profileMenuAvatar.textContent =
            initial;

    }


    if (profileMenuUsername) {

        profileMenuUsername.textContent =
            email;

    }

}


if (adminProfile) {

    adminProfile.addEventListener(
        "click",
        async (event) => {

            event.stopPropagation();

            const saved = sessionStorage.getItem("taskAdminSession") || localStorage.getItem("taskAdminSession");
            const token = JSON.parse(saved || "null")?.authToken;
            if (token) fetch("/api/logout", { method: "POST", keepalive: true, headers: { Authorization: `Bearer ${token}` } }).catch(() => {});


            if (profileContainer) {

                profileContainer.classList.toggle(
                    "active"
                );

            }

        }
    );

}


if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async (event) => {

            event.stopPropagation();

            const saved = sessionStorage.getItem("taskAdminSession") || localStorage.getItem("taskAdminSession");
            const token = JSON.parse(saved || "null")?.authToken;
            if (token) fetch("/api/logout", { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => {});


            sessionStorage.removeItem(
                "taskAdminSession"
            );
            localStorage.removeItem("taskAdminSession");


            window.location.href =
                "index.html";

        }
    );

}


document.addEventListener(
    "click",
    (event) => {

        if (
            profileContainer &&
            !profileContainer.contains(
                event.target
            )
        ) {

            profileContainer.classList.remove(
                "active"
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


updateAdminProfile();

renderClients();
window.setInterval(() => {
    if (!document.hidden) renderClients();
}, 15 * 1000);
