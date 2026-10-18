# Task Management System

A web-based Task Management System designed to help administrators manage clients, assign tasks, monitor progress, track submissions, and maintain task history.

## Features

### Administrator
- Manage client records.
- Create and assign tasks to clients.
- Set task priorities and deadlines.
- Track task progress and submissions.
- Review submitted work and provide feedback.
- View task history and notifications.
- Manage client-related task workflows.

### Client
- Register using an email address already added by an administrator.
- Log in to access assigned tasks.
- View task details and deadlines.
- Submit task work and attachments.
- Track task status and feedback.
- Receive website notifications and scheduled reminders.
- Request password resets through email.

### Additional Functionality
- Role-based access for administrators and clients.
- Password hashing using bcrypt.
- Session-based authentication.
- Password-reset functionality.
- Email reminders and notifications.
- Task lifecycle management and history archival.

## Technology Stack

**Frontend**
- HTML5
- CSS3
- JavaScript

**Backend**
- Node.js
- Express.js

**Database**
- MongoDB
- Mongoose

**Additional Libraries and Services**
- bcrypt
- Google Auth Library
- Resend email API

## Project Structure

```text
TaskManagementSystem/
├── backend/
│   ├── models/
│   │   ├── Client.js
│   │   ├── ClientHistory.js
│   │   ├── TaskHistory.js
│   │   └── User.js
│   ├── config.js
│   ├── server.js
│   └── test and utility scripts
├── frontend/
│   ├── index.html
│   ├── dashboard.html
│   ├── add-task.html
│   ├── add-client.html
│   ├── client-dashboard.html
│   ├── task-details.html
│   ├── task-history.html
│   ├── reset-password.html
│   ├── JavaScript files
│   └── CSS files
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

## Prerequisites

Install the following before running the application:

- Node.js (version 20 or later recommended)
- npm
- MongoDB Community Server, running locally

## Installation and Setup

### 1. Clone the repository

```bash
git clone https://github.com/VikramAsh01/Task-Management-Application.git
```

### 2. Open the project directory

```bash
cd Task-Management-Application
```

### 3. Install dependencies

```bash
npm install
```

### 4. Configure environment variables

Create a `.env` file in the project root directory using `.env.example` as a reference.

Configure the email settings if you want to use password-reset emails and email reminders:

```env
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=your_verified_sender_email
APP_BASE_URL=http://localhost:5000
```

Keep actual API keys and credentials private. Never commit `.env` to GitHub.

### 5. Start MongoDB

Ensure your local MongoDB service is running.

The current backend connects to:

```text
mongodb://127.0.0.1:27017/task_management
```

The database name is `task_management`. MongoDB stores the application's user accounts, client records, tasks, notifications, and history.

### 6. Configure an administrator account

An administrator account must already exist in the database before administrator login can work.

Client registration also requires an existing client record created by an administrator.

Set up the initial administrator using a secure, trusted provisioning process. Do not publish administrator passwords or database credentials.

### 7. Start the application

Run the backend from the project root:

```bash
node backend/server.js
```

When the database connection succeeds, the server should start at:

```text
http://localhost:5000
```

Open this address in your browser to access the application.

## Email Configuration

The application uses the Resend API for email delivery.

To enable password-reset emails and email reminders:

1. Create a Resend account.
2. Obtain an API key.
3. Configure a verified sender address.
4. Set the required values in `.env`.
5. Ensure `APP_BASE_URL` matches the address used to access the application.

Without valid email configuration, email-based features may not work.

## Database and Deployment Notes

- MongoDB must be available for the backend to operate.
- A local database is not automatically transferred when this repository is cloned.
- User accounts, client records, tasks, and history must be provisioned or migrated separately when moving to another database.
- The current backend uses a hardcoded local MongoDB connection string.
- For cloud deployment, configure an appropriate database connection, server environment variables, network access, and persistent storage for uploaded files.
- Never expose database credentials, API keys, or private user information in a public repository.

## Security

- Keep `.env` excluded from version control.
- Do not commit passwords, API keys, or private database connection strings.
- Use strong administrator credentials.
- Restrict access to administrative operations.
- Configure HTTPS and secure production settings before public deployment.

## Future Improvements

Potential improvements include:

- Cloud deployment for the frontend and backend.
- Managed MongoDB hosting.
- Environment-based database configuration.
- Automated tests and continuous integration.
- Enhanced audit logging and monitoring.

## Author

**VikramAsh01**

GitHub Repository:  
https://github.com/VikramAsh01/Task-Management-Application
