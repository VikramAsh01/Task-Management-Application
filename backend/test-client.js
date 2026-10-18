const mongoose = require("mongoose");
const Client = require("./models/Client");

const MONGO_URI = "mongodb://127.0.0.1:27017/task_management";

async function testClient() {
    try {
        await mongoose.connect(MONGO_URI);

        console.log("MongoDB connected");

        const client = new Client({
            clientId: "test-client-1",
            name: "Test Client",
            phone: "+91 98765 43210",
            designation: "Software Developer",
            email: "testclient@example.com",
            tasks: []
        });

        const savedClient =
            await client.save();

        console.log("Client created successfully");
        console.log(savedClient);

        await mongoose.disconnect();

        console.log("MongoDB disconnected");

    } catch (error) {

        console.error(
            "Error:",
            error
        );

        await mongoose.disconnect();
    }
}

testClient();