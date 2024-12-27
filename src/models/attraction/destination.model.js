const { Schema, model } = require("mongoose");

const destinationSchema = new Schema(
    {
        code: {
            type: String,
            uppercase: true,
            // required: true,
        },
        country: {
            type: Schema.Types.ObjectId,
            ref: "Country",
            required: true,
        },
        name: {
            type: String,
            lowercase: true,
            trim: true,
            required: true,
        },
        slug: {
            type: String,
            slug: ["name"],
            unique: true,
        },
        image: {
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

const Destination = model("Destination", destinationSchema);

module.exports = Destination;
