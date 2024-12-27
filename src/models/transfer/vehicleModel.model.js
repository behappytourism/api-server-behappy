const { Schema, model } = require("mongoose");

const vehicleModelSchema = new Schema(
    {
        modelName: {
            type: String,
            required: true,
            lowercase: true,
        },
        vehicleMake: {
            type: Schema.Types.ObjectId,
            ref: "VehicleMake",
            required: true,
        },
        bodyType: {
            type: Schema.Types.ObjectId,
            ref: "VehicleBodyType",
            required: true,
        },
        vehicleImage: {
            type: String,
        },
    },
    { timestamps: true }
);

const VehicleModel = model("VehicleModel", vehicleModelSchema);

module.exports = VehicleModel;
