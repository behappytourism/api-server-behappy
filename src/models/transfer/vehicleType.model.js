const { Schema, model } = require("mongoose");

const vehicleTypeSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        airportOccupancy: {
            type: Number,
            required: true,
        },
        normalOccupancy: {
            type: Number,
            required: true,
        },
        isDeleted: {
            type: Boolean,
            default: false,
            required: true,
        },
        vehicleCategoryId: {
            type: Schema.Types.ObjectId,
            ref: "VehicleCategory",
            // required: true,
        },
        image: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

const VehicleType = model("VehicleType", vehicleTypeSchema);

module.exports = VehicleType;
