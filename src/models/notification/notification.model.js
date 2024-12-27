const { Schema, model } = require("mongoose");

const notificationSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
        },
        body: {
            type: String,
            required: true,
        },
        page: {
            type: String,
            required: true,
            lowercase: true,
        },
        image: {
            type: String,
            required: true,
        },
        isDeleted: {
            type: Boolean,
            required: true,
        },
        slug: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

const Notification = model("Notification", notificationSchema);

module.exports = Notification;
