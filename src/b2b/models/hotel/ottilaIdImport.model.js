const { Schema, model } = require("mongoose");

const OttilaIdImportSchema = new Schema(
    {
        ottilaNotMatchedHotels: {
            type: Array,
            default: [],
        },
        completed: {
            type: Boolean,
            required: true,
            default: false,
        },
    },
    { timestamps: true }
);

const OttilaIdImport = model("OttilaIdImport", OttilaIdImportSchema);

module.exports = OttilaIdImport;
