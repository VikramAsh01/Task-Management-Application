const form = document.getElementById("resetPasswordForm");
const resetButton = document.getElementById("resetButton");
const message = document.getElementById("message");
const token = new URLSearchParams(window.location.search).get("token") || "";

if (!token) {
    message.textContent = "This reset link is missing its token. Request a new password reset link.";
    resetButton.disabled = true;
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "";

    const password = document.getElementById("newPassword").value;
    const confirmation = document.getElementById("confirmPassword").value;

    if (password.length < 8) {
        message.textContent = "Your password must be at least 8 characters long.";
        return;
    }
    if (password !== confirmation) {
        message.textContent = "The passwords do not match.";
        return;
    }

    resetButton.disabled = true;
    resetButton.textContent = "Updating password...";

    try {
        const response = await fetch("/api/auth/password-reset/confirm", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token, password })
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.message || "Could not reset the password.");
        }
        message.textContent = result.message;
        form.reset();
        window.setTimeout(() => { window.location.href = "index.html"; }, 1800);
    } catch (error) {
        message.textContent = error.message || "Could not reset the password. Request a new link.";
    } finally {
        resetButton.disabled = false;
        resetButton.textContent = "Reset password";
    }
});
