const mongoose = require("mongoose");

let options = {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
};

if (process.env.MONGODB_USER && process.env.MONGODB_PASS) {
    options.auth = {
        user: process.env.MONGODB_USER,
        password: process.env.MONGODB_PASS,
    };
}

let connectMongoDB = () => {
    return mongoose
        .connect(process.env.MONGODB_URL, options)
        .then((res) => {
            console.log("Successfully connected to mongoDB.");
            return res;
        })
        .catch((error) => {
            console.log("Error connecting to mongoDB.");
            throw error;
        });
};

module.exports = connectMongoDB;
