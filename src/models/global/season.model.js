const { Schema, model } = require("mongoose");

const seasonSchema = new Schema(
    {
        fromDate: {
            type: Date,
            required: true,
        },
        toDate: {
            type: Date,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        isDeleted: {
            type: Boolean,
            required: true,
            default: false,
        },
    },
    { timestamps: true }
);

const Season = model("Season", seasonSchema);

module.exports = Season;
