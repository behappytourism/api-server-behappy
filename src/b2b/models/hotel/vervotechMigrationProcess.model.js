const { Schema, model } = require("mongoose");

const VervotechMigrationProcessSchema = new Schema(
    {
        No: {
            type: Number,
            required: true,
        },
        resumeKey: {
            type: String,
            required: true,
        },
        migrationCompleted: {
            type: Boolean,
            required: true,
            default: false,
        },
        unmatchedProviders: {
            type: Array,
            required: true,
            default: [],
        },
        mismathedProviders: {
            type: Array,
            required: true,
            default: [],
        },
    },
    { timestamps: true }
);

const VervotechMigrationProcess = model(
    "VervotechMigrationProcess",
    VervotechMigrationProcessSchema
);

module.exports = VervotechMigrationProcess;
