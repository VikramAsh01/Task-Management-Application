const mongoose = require("mongoose");
const User = require("./models/User");

const MONGO_URI = "mongodb://127.0.0.1:27017/task_management";

async function testUserModel() {
    try {
        await mongoose.connect(MONGO_URI);

        console.log("MongoDB connected");

        const user = await User.findOne({
            email: "admin@example.com"
        });

        console.log(user);

        await mongoose.disconnect();

        console.log("MongoDB disconnected");
    } catch (error) {
        console.error(error);
    }
}

testUserModel();