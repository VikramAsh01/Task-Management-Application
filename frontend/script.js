function initializeAdminProfile() {

    const adminProfile =
        document.querySelector(
            ".admin-profile"
        );

    if (!adminProfile) {
        return;
    }

    if (
        document.getElementById(
            "sharedAdminProfileMenu"
        )
    ) {
        return;
    }

    const savedSession =
        sessionStorage.getItem(
            "taskAdminSession"
        ) || localStorage.getItem("taskAdminSession");
    if (savedSession && !sessionStorage.getItem("taskAdminSession")) {
        sessionStorage.setItem("taskAdminSession", savedSession);
    }

    let admin = {
        username: "Admin",
        email: "",
        role: "admin",
        loginMethod:
            "Username / Password"
    };

    if (savedSession) {

        try {

            admin =
                JSON.parse(
                    savedSession
                );

        } catch {

            admin = {
                username: "Admin",
                email: "",
                role: "admin",
                loginMethod:
                    "Username / Password"
            };

        }

    }

    const username =
        admin.username ||
        admin.name ||
        "Admin";

    const email =
        admin.email ||
        "";

    const role =
        admin.role === "client"
            ? "Client"
            : "Administrator";

    const initial =
        username
            .charAt(0)
            .toUpperCase() ||
        "A";

    const avatar =
        adminProfile.querySelector(
            ".profile-avatar"
        );

    const name =
        adminProfile.querySelector(
            ".admin-name"
        );

    if (avatar) {

        avatar.textContent =
            initial;

    }

    if (name) {

        name.textContent =
            username;

    }

    adminProfile.style.cursor =
        "pointer";

    adminProfile.setAttribute(
        "role",
        "button"
    );

    adminProfile.setAttribute(
        "tabindex",
        "0"
    );


    const style =
        document.createElement(
            "style"
        );

    style.textContent = `

        .shared-admin-profile-wrapper {
            position: relative;
        }

        .shared-admin-profile-wrapper
        .admin-profile {
            cursor: pointer;
            user-select: none;
        }

        .shared-admin-profile-arrow {
            margin-left: 6px;
            font-size: 10px;
            color: #6b7280;
            transition: transform 0.2s ease;
        }

        .shared-admin-profile-wrapper.active
        .shared-admin-profile-arrow {
            transform: rotate(180deg);
        }

        #sharedAdminProfileMenu {
            position: absolute;
            top: calc(100% + 10px);
            right: 0;
            width: 280px;
            background: #ffffff;
            border: 1px solid #e5e7eb;
            border-radius: 14px;
            box-shadow:
                0 15px 35px
                rgba(15, 23, 42, 0.16);
            padding: 16px;
            z-index: 9999;
            display: none;
        }

        .shared-admin-profile-wrapper.active
        #sharedAdminProfileMenu {
            display: block;
        }

        .shared-profile-header {
            display: flex;
            align-items: center;
            gap: 12px;
            padding-bottom: 14px;
            border-bottom:
                1px solid #eef0f3;
        }

        .shared-profile-avatar {
            width: 44px;
            height: 44px;
            border-radius: 50%;
            background: #172554;
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
        }

        .shared-profile-name {
            margin: 0 0 4px;
            font-size: 14px;
            font-weight: 700;
            color: #111827;
        }

        .shared-profile-username {
            margin: 0;
            font-size: 12px;
            color: #6b7280;
            word-break: break-word;
        }

        .shared-profile-details {
            padding: 12px 0;
            border-bottom:
                1px solid #eef0f3;
        }

        .shared-profile-row {
            display: flex;
            justify-content: space-between;
            gap: 15px;
            padding: 7px 0;
        }

        .shared-profile-row span {
            font-size: 12px;
            color: #6b7280;
        }

        .shared-profile-row strong {
            font-size: 12px;
            color: #1f2937;
            text-align: right;
            word-break: break-word;
        }

        .shared-profile-logout {
            width: 100%;
            border: 0;
            background: #fff1f2;
            color: #be123c;
            border-radius: 8px;
            padding: 11px 12px;
            margin-top: 12px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
        }

        .shared-profile-logout:hover {
            background: #ffe4e6;
        }

    `;

    document.head.appendChild(
        style
    );


    const wrapper =
        document.createElement(
            "div"
        );

    wrapper.className =
        "shared-admin-profile-wrapper";


    adminProfile.parentNode.insertBefore(
        wrapper,
        adminProfile
    );

    wrapper.appendChild(
        adminProfile
    );


    const arrow =
        document.createElement(
            "span"
        );

    arrow.className =
        "shared-admin-profile-arrow";

    arrow.textContent =
        "▼";

    adminProfile.appendChild(
        arrow
    );


    const menu =
        document.createElement(
            "div"
        );

    menu.id =
        "sharedAdminProfileMenu";


    menu.innerHTML = `

        <div class="shared-profile-header">

            <div class="shared-profile-avatar">
                ${initial}
            </div>

            <div>

                <p class="shared-profile-name">
                    ${username}
                </p>

                <p class="shared-profile-username">
                    ${email || username}
                </p>

            </div>

        </div>


        <div class="shared-profile-details">

            <div class="shared-profile-row">

                <span>
                    Role
                </span>

                <strong>
                    ${role}
                </strong>

            </div>


        </div>


        <button
            type="button"
            class="shared-profile-logout"
            id="sharedAdminLogout"
        >
            ↪ Log Out
        </button>

    `;


    wrapper.appendChild(
        menu
    );


    adminProfile.addEventListener(
        "click",
        (event) => {

            event.stopPropagation();

            wrapper.classList.toggle(
                "active"
            );

        }
    );


    adminProfile.addEventListener(
        "keydown",
        (event) => {

            if (
                event.key === "Enter" ||
                event.key === " "
            ) {

                event.preventDefault();

                wrapper.classList.toggle(
                    "active"
                );

            }

        }
    );


    document.addEventListener(
        "click",
        (event) => {

            if (
                !wrapper.contains(
                    event.target
                )
            ) {

                wrapper.classList.remove(
                    "active"
                );

            }

        }
    );


    const logoutButton =
        document.getElementById(
            "sharedAdminLogout"
        );


    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            async (event) => {

                event.stopPropagation();

                const saved = sessionStorage.getItem("taskAdminSession") || localStorage.getItem("taskAdminSession");
                const token = JSON.parse(saved || "null")?.authToken;
                if (token) fetch("/api/logout", { method: "POST", keepalive: true, headers: { Authorization: `Bearer ${token}` } }).catch(() => {});

                sessionStorage.removeItem(
                    "taskAdminSession"
                );
                localStorage.removeItem("taskAdminSession");
                sessionStorage.removeItem("taskClientSession");
                localStorage.removeItem("taskClientSession");

                window.location.href =
                    "index.html";

            }
        );

    }

}


initializeAdminProfile();


function openUserDashboard(loggedInUser, authToken, loginMethod = "Email / Password", rememberMe = false) {

    if (!loggedInUser || !loggedInUser.role) {

        alert("The server returned an invalid user account.");

        return;

    }

    const userSession = {

        id: loggedInUser.id,

        username: loggedInUser.name,

        email: loggedInUser.email,

        role: loggedInUser.role,

        clientId: loggedInUser.clientId || null,

        authToken: authToken || "",

        loginMethod: loginMethod

    };

    sessionStorage.removeItem("taskAdminSession");
    sessionStorage.removeItem("taskClientSession");
    localStorage.removeItem("taskAdminSession");
    localStorage.removeItem("taskClientSession");

    if (loggedInUser.role === "admin") {

        sessionStorage.setItem(
            "taskAdminSession",
            JSON.stringify(userSession)
        );
        if (rememberMe) localStorage.setItem("taskAdminSession", JSON.stringify(userSession));

        window.location.href = "dashboard.html";

        return;

    }

    if (loggedInUser.role === "client") {

        if (!loggedInUser.clientId) {

            alert("Client account is not linked to a client.");

            return;

        }

        sessionStorage.setItem(
            "taskClientSession",
            JSON.stringify(userSession)
        );
        if (rememberMe) localStorage.setItem("taskClientSession", JSON.stringify(userSession));

        window.location.href =
            `client-dashboard.html?client=${encodeURIComponent(
                loggedInUser.clientId
            )}`;

        return;

    }

    alert("Invalid user role.");

}

async function initializeGoogleClientLogin(container) {
    container.textContent = "Loading Google sign-in…";
    container.style.cursor = "default";

    try {
        const configResponse = await fetch("/api/config/google");
        const config = await configResponse.json();
        if (!configResponse.ok || !config.googleClientId) {
            container.textContent = "Google sign-in needs setup";
            container.title = "Add a Google Web OAuth Client ID in backend/config.js";
            return;
        }

        for (let attempt = 0; attempt < 50 && !window.google?.accounts?.id; attempt++) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        if (!window.google?.accounts?.id) {
            throw new Error("Google sign-in did not load. Check your internet connection and try again.");
        }

        window.google.accounts.id.initialize({
            client_id: config.googleClientId,
            callback: async (googleResponse) => {
                try {
                    const response = await fetch("/api/auth/google/client", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ credential: googleResponse.credential })
                    });
                    const result = await response.json();
                    if (!response.ok || !result.success) {
                        throw new Error(result.message || "Google client sign-in failed.");
                    }
                    openUserDashboard(result.user, result.token, "Google");
                } catch (error) {
                    alert(error.message || "Unable to sign in with Google.");
                }
            }
        });

        container.replaceChildren();
        window.google.accounts.id.renderButton(container, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "continue_with",
            shape: "rect",
            width: Math.max(220, Math.floor(container.getBoundingClientRect().width))
        });
        container.style.cursor = "pointer";
    } catch (error) {
        console.error("Google sign-in setup error:", error);
        container.textContent = error.message || "Unable to load Google sign-in.";
    }
}


if (
    document.getElementById(
        "loginForm"
    )
) {


    const password =
        document.getElementById(
            "password"
        );


    const togglePassword =
        document.getElementById(
            "togglePassword"
        );


    if (togglePassword) {

        togglePassword.addEventListener(
            "click",
            () => {

                if (
                    password.type ===
                    "password"
                ) {

                    password.type =
                        "text";

                    togglePassword.textContent =
                        "○";

                } else {

                    password.type =
                        "password";

                    togglePassword.textContent =
                        "◉";

                }

            }
        );

    }


    const loginForm =
        document.getElementById(
            "loginForm"
        );


    loginForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            const username =
                document.getElementById(
                    "username"
                ).value.trim();


            const passwordValue =
                document.getElementById(
                    "password"
                ).value;


            if (
                !username ||
                !passwordValue
            ) {

                alert(
                    "Please enter your email and password."
                );

                return;

            }


            try {

                const response =
                    await fetch(
                        "/api/login",
                        {
                            method:
                                "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    email:
                                        username,

                                    password:
                                        passwordValue,
                                    rememberMe: Boolean(document.getElementById("rememberMe")?.checked)
                                })
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok ||
                    !data.success
                ) {

                    alert(
                        data.message ||
                        "Invalid email or password"
                    );

                    return;

                }


                const loggedInUser =
                    data.user;


                openUserDashboard(
                    loggedInUser,
                    data.token,
                    "Email / Password",
                    Boolean(document.getElementById("rememberMe")?.checked)
                );

            } catch (error) {

                console.error(
                    "Login error:",
                    error
                );

                alert(
                    "Unable to connect to the server. Please try again."
                );

            }

        }
    );

    (async function restoreRememberedLogin() {
        const storedKey = localStorage.getItem("taskAdminSession") ? "taskAdminSession" : "taskClientSession";
        const saved = localStorage.getItem(storedKey);
        if (!saved) return;
        const checkbox = document.getElementById("rememberMe");
        if (checkbox) checkbox.checked = true;
        let remembered;
        try { remembered = JSON.parse(saved); } catch { localStorage.removeItem(storedKey); return; }
        if (!remembered?.authToken) { localStorage.removeItem(storedKey); return; }
        try {
            const response = await fetch("/api/auth/session", { headers: { Authorization: `Bearer ${remembered.authToken}` } });
            const data = await response.json();
            if (!response.ok || !data.success) {
                localStorage.removeItem(storedKey);
                if (response.status === 403) alert(data.message || "This client account is no longer active.");
                return;
            }
            const session = { ...remembered, id: data.user.id, username: data.user.name, email: data.user.email, role: data.user.role, clientId: data.user.clientId || null };
            const key = session.role === "admin" ? "taskAdminSession" : "taskClientSession";
            localStorage.setItem(key, JSON.stringify(session));
            sessionStorage.setItem(key, JSON.stringify(session));
            window.location.replace(session.role === "admin" ? "dashboard.html" : `client-dashboard.html?client=${encodeURIComponent(session.clientId)}`);
        } catch (error) {
            console.error("Unable to restore remembered login:", error);
        }
    })();


    const clientRegisterForm =
        document.getElementById(
            "clientRegisterForm"
        );

    const showClientRegistration =
        document.getElementById(
            "showClientRegistration"
        );

    const showLogin =
        document.getElementById(
            "showLogin"
        );

    const loginDivider =
        document.getElementById(
            "loginDivider"
        );

    const googleLoginButton =
        document.getElementById(
            "googleLogin"
        );

    function setRegistrationVisible(visible) {

        loginForm.classList.toggle(
            "hidden",
            visible
        );

        clientRegisterForm.classList.toggle(
            "hidden",
            !visible
        );

        showClientRegistration.classList.toggle(
            "hidden",
            visible
        );

        showLogin.classList.toggle(
            "hidden",
            !visible
        );

        loginDivider.classList.toggle(
            "hidden",
            visible
        );

        googleLoginButton.classList.toggle(
            "hidden",
            visible
        );

    }

    showClientRegistration.addEventListener(
        "click",
        () => setRegistrationVisible(true)
    );

    showLogin.addEventListener(
        "click",
        () => setRegistrationVisible(false)
    );

    clientRegisterForm.addEventListener(
        "submit",
        async (event) => {

            event.preventDefault();

            const email =
                document.getElementById(
                    "registerEmail"
                ).value.trim();

            const passwordValue =
                document.getElementById(
                    "registerPassword"
                ).value;

            const confirmPassword =
                document.getElementById(
                    "registerConfirmPassword"
                ).value;

            if (passwordValue.length < 8) {

                alert("Password must be at least 8 characters long.");

                return;

            }

            if (passwordValue !== confirmPassword) {

                alert("The passwords do not match.");

                return;

            }

            const registerButton =
                document.getElementById(
                    "registerClientButton"
                );

            registerButton.disabled = true;
            registerButton.textContent = "Creating account...";

            try {

                const response =
                    await fetch(
                        "/api/client-register",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                email: email,
                                password: passwordValue
                            })
                        }
                    );

                const data = await response.json();

                if (!response.ok || !data.success || !data.user) {

                    throw new Error(
                        data.message || "Unable to create client account."
                    );

                }

                openUserDashboard(
                    data.user,
                    data.token
                );

            } catch (error) {

                console.error(
                    "Client registration error:",
                    error
                );

                alert(
                    error.message ||
                    "Unable to create your account. Please try again."
                );

            } finally {

                registerButton.disabled = false;
                registerButton.textContent =
                    "Create Client Account";

            }

        }
    );


    const googleLogin =
        document.getElementById(
            "googleLogin"
        );


    if (googleLogin) {
        initializeGoogleClientLogin(googleLogin);

    }


    const forgotPassword =
        document.getElementById(
            "forgotPassword"
        );


    if (forgotPassword) {

        forgotPassword.addEventListener(
            "click",
            async () => {
                const emailInput = document.getElementById("username");
                const email = (emailInput?.value || window.prompt("Enter your account email address:") || "")
                    .trim();

                if (!email) return;

                try {
                    const response = await fetch("/api/auth/password-reset/request", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email })
                    });
                    const result = await response.json();
                    if (!response.ok || !result.success) {
                        throw new Error(result.message || "Could not request a reset link.");
                    }
                    alert(result.message);
                } catch (error) {
                    console.error("Password reset request failed:", error);
                    alert(error.message || "Could not request a reset link. Try again later.");
                }
            }
        );

    }


    const themeButton =
        document.getElementById(
            "themeButton"
        );


    if (themeButton) {

        themeButton.addEventListener(
            "click",
            () => {

                alert(
                    "Theme settings will be added later."
                );

            }
        );

    }

}
