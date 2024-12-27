const mongoose = require("mongoose");
const slug = require("mongoose-slug-generator");
const { Schema, model } = mongoose;

const { Counter } = require("../global");

mongoose.plugin(slug);

const attractionCategorySchema = new Schema(
    {
        code: {
            type: Number,
            unique: true,
        },
        categoryName: {
            type: String,
            required: true,
            lowercase: true,
        },
        slug: {
            type: String,
            slug: ["categoryName"],
            unique: true,
        },
        description: {
            type: String,
        },
        icon: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

attractionCategorySchema.pre("save", async function (next) {
    if (!this.code) {
        try {
            const counterDoc = await Counter.findOneAndUpdate(
                { identifier: "attraction-category" },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );

            this.code = counterDoc.seq;

            next();
        } catch (error) {
            next(error);
        }
    } else {
        next();
    }
});

const AttractionCategory = model("AttractionCategory", attractionCategorySchema);

module.exports = AttractionCategory;
