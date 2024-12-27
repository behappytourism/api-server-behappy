const { Schema, model } = require("mongoose");

const vehicleSchema = new Schema(
    {
        vehicleMake: {
            type: Schema.Types.ObjectId,
            ref: "VehicleMake",
            required: true,
        },
        vehicleModel: {
            type: Schema.Types.ObjectId,
            ref: "VehicleModel",
            required: true,
        },
        vehicleTrim: {
            type: Schema.Types.ObjectId,
            ref: "VehicleTrim",
            required: true,
        },
        vehicleCategory: {
            type: Schema.Types.ObjectId,
            ref: "VehicleCategory",
            required: true,
        },
        vehicleType: {
            type: Schema.Types.ObjectId,
            ref: "VehicleType",
            required: true,
        },
        year: {
            type: Number,
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
        registrationNumber: {
            type: String,
        },
        registrationExpDate: {
            type: Date,
        },
        insuranceNumber: {
            type: String,
        },
        insuranceExpDate: {
            type: Date,
        },
        vinNumber: {
            type: String,
        },
        transmissionType: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["automatic", "manual"],
        },
        vehicleColor: {
            type: String,
        },
    },
    { timestamps: true }
);

const Vehicle = model("Vehicle", vehicleSchema);

module.exports = Vehicle;
