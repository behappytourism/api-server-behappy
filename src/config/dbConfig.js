const mongoose = require("mongoose");

const mongoUrl = process.env.MONGODB_URL;

const connectMonogdb = async () => {
    try {
        mongoose.connect(mongoUrl, (error) => {
            if (!error) {
                console.log("database connection established successfully");
            } else {
                console.log(error);
            }
        });
    } catch (err) {
        throw err;
    }
};

module.exports = { connectMonogdb };
