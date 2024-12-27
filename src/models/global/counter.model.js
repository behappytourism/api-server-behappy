const { Schema, model } = require("mongoose");

const counterSchema = new Schema({
    identifier: {
        type: String,
        required: true,
        lowercase: true,
        unique: true,
    },
    seq: {
        type: Number,
        required: true,
        default: 1,
    },
    reference_value: {},
});

const Counter = model("Counter", counterSchema);

module.exports = Counter;
