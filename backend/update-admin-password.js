const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const User = require("./models/User");

const MONGO_URI = "mongodb://127.0.0.1:27017/task_management";

async function updateAdminPassword() {
    try {
        await mongoose.connect(MONGO_URI);

        console.log("MongoDB connected");

        const hashedPassword = await bcrypt.hash("Admin@123", 10);

        const user = await User.findOneAndUpdate(
            { email: "admin@example.com" },
            { password: hashedPassword },
            { new: true }
        );

        if (!user) {
            console.log("Admin user not found");
            return;
        }

        console.log("Admin password updated successfully");
        console.log("Email:", user.email);
        console.log("Role:", user.role);
        console.log("Password is now securely hashed");

        await mongoose.disconnect();

        console.log("MongoDB disconnected");
    } catch (error) {
        console.error("Error:", error);

        await mongoose.disconnect();
    }
}

updateAdminPassword();