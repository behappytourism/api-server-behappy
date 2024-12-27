const { Schema, model } = require("mongoose");

const attractionReviewSchema = new Schema(
    {
        title: {
            type: String,
            required: true,
        },
        description: {
            type: String,
            required: true,
        },
        rating: {
            type: Number,
            required: true,
            validate: {
                validator: function (v) {
                    return v <= 5 && v >= 1;
                },
                message: () => "Rating should be between 5 and 1",
            },
        },
        attraction: {
            type: Schema.Types.ObjectId,
            ref: "Attraction",
            required: true,
        },
        createdBy: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["user", "reseller", "admin"],
        },
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: function () {
                return this.createdBy === "user";
            },
        },
        userName: {
            type: String,
            required: function () {
                return this.createdBy === "admin";
            },
        },
        image: {
            type: String,
        },
        isDelelted: {
            type: Boolean,
            required: true,
            default: false,
        },
    },
    { timestamps: true }
);

const AttractionReview = model("AttractionReview", attractionReviewSchema);

module.exports = AttractionReview;
