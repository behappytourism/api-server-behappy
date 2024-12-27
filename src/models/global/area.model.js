const { Schema, model } = require("mongoose");

const areaSchema = new Schema(
    {
        areaCode: {
            type: String,
            required: true,
            uppercase: true,
        },
        areaName: {
            type: String,
            required: true,
        },
        city: {
            type: Schema.Types.ObjectId,
            ref: "City",
            required: true,
        },
        state: {
            type: Schema.Types.ObjectId,
            ref: "State",
            // required: true,
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

areaSchema.virtual("propertyCount", {
    ref: "Hotel",
    localField: "_id",
    foreignField: "area",
    count: true,
});

const Area = model("Area", areaSchema);

module.exports = Area;
