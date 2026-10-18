(() => {
    const button = document.getElementById("notification");
    if (!button) return;

    const adminSession = (() => {
        try {
            const saved = sessionStorage.getItem("taskAdminSession") || localStorage.getItem("taskAdminSession");
            if (saved && !sessionStorage.getItem("taskAdminSession")) sessionStorage.setItem("taskAdminSession", saved);
            return JSON.parse(saved || "null");
        } catch {
            return null;
        }
    })();

    const panel = document.createElement("section");
    panel.setAttribute("aria-label", "Admin notifications");
    Object.assign(panel.style, {
        position: "fixed", top: "78px", right: "24px", width: "min(370px, calc(100vw - 32px))",
        maxHeight: "min(520px, calc(100vh - 100px))", overflowY: "auto", zIndex: "9999",
        background: "#fff", color: "#182230", border: "1px solid #dce2ea", borderRadius: "14px",
        boxShadow: "0 16px 42px rgba(16, 24, 40, .18)", display: "none", fontFamily: "inherit"
    });
    document.body.appendChild(panel);

    const badge = document.createElement("span");
    Object.assign(badge.style, {
        position: "absolute", top: "-5px", right: "-5px", minWidth: "18px", height: "18px",
        padding: "0 4px", borderRadius: "999px", background: "#dc2626", color: "#fff",
        fontSize: "11px", lineHeight: "18px", fontWeight: "700", display: "none"
    });
    button.style.position = "relative";
    button.appendChild(badge);

    let notifications = [];

    function render() {
        const unread = notifications.filter((item) => !item.read).length;
        badge.textContent = unread > 99 ? "99+" : String(unread);
        badge.style.display = unread ? "block" : "none";
        panel.innerHTML = `<div style="padding:16px 18px;border-bottom:1px solid #e8ecf1;font-weight:700">Admin notifications</div>`;

        if (!notifications.length) {
            panel.insertAdjacentHTML("beforeend", `<p style="margin:0;padding:22px 18px;color:#667085">No notifications yet.</p>`);
            return;
        }

        notifications.slice().reverse().forEach((item) => {
            const row = document.createElement("article");
            Object.assign(row.style, {
                padding: "14px 18px", borderBottom: "1px solid #eef0f3",
                background: item.read ? "#fff" : "#f2f7ff"
            });
            const message = document.createElement("p");
            message.textContent = item.message || "You have a new notification.";
            Object.assign(message.style, { margin: "0 0 6px", fontSize: "14px", lineHeight: "1.45" });
            const date = document.createElement("time");
            date.textContent = item.createdAt ? new Date(item.createdAt).toLocaleString() : "";
            Object.assign(date.style, { color: "#667085", fontSize: "12px" });
            row.append(message, date);
            panel.appendChild(row);
        });
    }

    async function load(markRead = false) {
        if (!adminSession?.authToken) {
            panel.innerHTML = `<div style="padding:16px 18px;font-weight:700">Admin notifications</div><p style="padding:0 18px 18px;color:#667085">Please sign in again to load notifications.</p>`;
            return;
        }

        try {
            const response = await fetch("/api/admin/notifications", {
                headers: { Authorization: `Bearer ${adminSession.authToken}` }
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || "Unable to load notifications");
            notifications = Array.isArray(result.notifications) ? result.notifications : [];
            render();

            if (markRead && result.unreadCount > 0) {
                const readResponse = await fetch("/api/admin/notifications/read", {
                    method: "PUT",
                    headers: { Authorization: `Bearer ${adminSession.authToken}` }
                });
                if (readResponse.ok) {
                    notifications = notifications.map((item) => ({ ...item, read: true }));
                    render();
                }
            }
        } catch (error) {
            panel.innerHTML = `<div style="padding:16px 18px;font-weight:700">Admin notifications</div>`;
            const errorMessage = document.createElement("p");
            errorMessage.textContent = String(error.message || "Unable to load notifications");
            Object.assign(errorMessage.style, { padding: "0 18px 18px", color: "#b42318" });
            panel.appendChild(errorMessage);
        }
    }

    document.addEventListener("click", (event) => {
        if (event.target.closest("#notification")) {
            event.preventDefault();
            event.stopImmediatePropagation();
            const opening = panel.style.display === "none";
            panel.style.display = opening ? "block" : "none";
            if (opening) load(true);
        } else if (!panel.contains(event.target)) {
            panel.style.display = "none";
        }
    }, true);

    load(false);
    window.setInterval(() => load(false), 15000);
})();
