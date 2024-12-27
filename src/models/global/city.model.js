const { Schema, model } = require("mongoose");

const citySchema = new Schema(
    {
        cityCode: {
            type: String,
            required: true,
            uppercase: true,
        },
        cityName: {
            type: String,
            required: true,
            trim: true,
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

citySchema.virtual("propertyCount", {
    ref: "Hotel",
    localField: "_id",
    foreignField: "city",
    count: true,
});

const City = model("City", citySchema);

module.exports = City;
