// Google OAuth Client IDs are public browser configuration, not secrets.
// Create a Web application OAuth Client ID in Google Cloud Console and paste it here.
module.exports = {
    googleClientId: process.env.GOOGLE_CLIENT_ID || "PASTE_YOUR_GOOGLE_WEB_CLIENT_ID_HERE",
    resendApiKey: process.env.RESEND_API_KEY || "",
    resendFromEmail: process.env.RESEND_FROM_EMAIL || "",
    appBaseUrl: (process.env.APP_BASE_URL || "http://localhost:5000").replace(/\/$/, "")
};
