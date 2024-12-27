const { Schema, model } = require("mongoose");

const stateSchema = new Schema(
    {
        stateName: {
            type: String,
            required: true,
        },
        stateCode: {
            type: String,
            required: true,
            uppercase: true,
        },
        country: {
            type: Schema.Types.ObjectId,
            ref: "Country",
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

const State = model("State", stateSchema);

module.exports = State;
