const { Schema, model } = require("mongoose");

const vehicleCategorySchema = new Schema(
    {
        categoryName: {
            type: String,
            required: true,
            lowercase: true,
        },
    },
    { timestamps: true }
);

const VehicleCategory = model("VehicleCategory", vehicleCategorySchema);

module.exports = VehicleCategory;
