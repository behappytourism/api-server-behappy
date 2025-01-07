const mongoose = require("mongoose");
const slug = require("mongoose-slug-generator");
const { Schema, model } = mongoose;

mongoose.plugin(slug);

const eamilListingSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["manual", "custom"],
        },
        filePath: {
            type: String,
            required: function () {
                return this.type === "manual";
            },
        },
        recipientGroup: {
            type: String,
            // enum: ["b2b", "b2c", "admin"],
            required: function () {
                return this.type === "custom";
            },
        },
        products: {
            type: [String],
            enum: ["all", "attraction", "a2a", "flight", "hotel"],
            required: function () {
                return this.type === "custom" && this.recipientGroup === "b2b";
            },
        },
        isCountries: {
            type: Boolean,
            required: false,
            default: false,
        },
        countries: {
            type: [{ type: Schema.Types.ObjectId, ref: "Country", required: true }],
            required: function () {
                return this.isCountries === true && this.recipientGroup === "b2b";
            },
        },
        isDeleted: {
            type: Boolean,
            required: false,
            default: false,
        },
    },
    { timestamps: true }
);

const EmailList = model("EmailList", eamilListingSchema);

module.exports = EmailList;
