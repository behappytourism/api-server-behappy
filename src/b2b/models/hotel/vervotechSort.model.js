const { Schema, model } = require("mongoose");

const VervotechSortedSchema = new Schema(
    {
        No: {
            type: Number,
            required: true,
        },
        ResumeKey: {
            type: String,
            required: true,
        },
        ProviderFamily: {
            type: String,
            required: true,
        },
        Mappings: {
            type: Array,
            default: [],
        },
        Imported: {
            type: Boolean,
            required: true,
            default: false,
        },
    },
    { timestamps: true }
);

const VervotechSorted = model("VervotechSortRes", VervotechSortedSchema);

module.exports = VervotechSorted;
