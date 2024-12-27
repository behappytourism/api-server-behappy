const { Schema, model } = require("mongoose");

const b2cMarkupProfileSchema = new Schema(
    {
        settingsNumber: {
            type: Number,
            required: true,
            default: 1,
            unique: 1,
        },

        selectedProfile: {
            type: Schema.Types.ObjectId,
            ref: "MarkupProfile",
            required: true,
        },
    },
    { timestamps: true }
);

const B2cMarkupProfile = model("B2cMarkupProfile", b2cMarkupProfileSchema);

module.exports = B2cMarkupProfile;
