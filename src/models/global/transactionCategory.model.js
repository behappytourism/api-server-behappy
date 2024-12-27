const { Schema, model } = require("mongoose");

const transactionCategorySchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            unique: [true, "You have already used!"],
        },
        description: {
            type: String,
        },
        isDeleted: {
            type: Boolean,
            required: true,
            default: false,
        },
    },
    { timestamps: true }
);

const TransactionCategory = model("TransactionCategory", transactionCategorySchema);

module.exports = TransactionCategory;
