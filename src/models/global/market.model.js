const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const AutoIncrement = require("mongoose-sequence")(mongoose);

const newMarketSchema = new Schema(
    {
        marketId: {
            type: Number,
        },
        marketName: {
            type: String,
            required: true,
        },
        isDeleted: {
            type: Boolean,
            required: true,
            default: false,
        },
        isActive: {
            type: Boolean,
            required: true,
            default: true,
        },
    },
    { timestamps: true }
);

newMarketSchema.plugin(AutoIncrement, {
    inc_field: "marketId",
    start_seq: 1,
});

const Market = model("Market", newMarketSchema);

module.exports = Market;
