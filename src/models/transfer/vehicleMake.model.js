const { Schema, model } = require("mongoose");

const vehicleMakeSchema = new Schema(
    {
        companyName: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

const VehicleMake = model("VehicleMake", vehicleMakeSchema);

module.exports = VehicleMake;
