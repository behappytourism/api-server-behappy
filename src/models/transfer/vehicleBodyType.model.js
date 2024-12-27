const { Schema, model } = require("mongoose");

const vehicleBodyTypeSchema = new Schema(
    {
        bodyType: {
            type: String,
            required: true,
            lowercase: true,
        },
        bodyImg: {
            type: String,
            required: true,
        },
    },
    { timestamps: true }
);

const VehicleBodyType = model("VehicleBodyType", vehicleBodyTypeSchema);

module.exports = VehicleBodyType;
