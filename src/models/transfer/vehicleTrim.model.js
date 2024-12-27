const { Schema, model } = require("mongoose");

const vehicleTrimSchema = new Schema(
    {
        vehicleModel: {
            type: Schema.Types.ObjectId,
            ref: "VehicleModel",
            required: true,
        },
        trimName: {
            type: String,
            required: true,
        },
        airportSeatingCapacity: {
            type: Number,
            required: true,
        },
        normalSeatingCapacity: {
            type: Number,
            required: true,
        },
    },
    { timestamps: true }
);

const VehicleTrim = model("VehicleTrim", vehicleTrimSchema);

module.exports = VehicleTrim;
