const bcrypt = require("bcrypt");

const password = "Admin@123";

async function testPassword() {
    const hashedPassword = await bcrypt.hash(password, 10);

    console.log("Original password:");
    console.log(password);

    console.log("Hashed password:");
    console.log(hashedPassword);

    const isCorrect = await bcrypt.compare(password, hashedPassword);

    console.log("Password correct:");
    console.log(isCorrect);

    const isWrong = await bcrypt.compare("WrongPassword", hashedPassword);

    console.log("Wrong password:");
    console.log(isWrong);
}

testPassword();