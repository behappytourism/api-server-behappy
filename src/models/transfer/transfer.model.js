const { Schema, model } = require("mongoose");

const transferSchema = new Schema(
    {
        transferType: {
            type: String,
            enum: ["airport-group", "group-airport", "group-group", "airport-airport"],
            lowercase: true,
            required: true,
        },
        transferFrom: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        transferTo: {
            type: Schema.Types.ObjectId,
            required: true,
        },
        sharedPrice: {
            type: Number,
            // required: function () {
            //     return this.transferType === "city-city";
            // },
        },
        isDeleted: {
            type: Boolean,
            required: true,
            default: false,
        },
        vehicleType: [
            {
                price: {
                    type: Number,
                    required: true,
                },
                vehicle: {
                    type: Schema.Types.ObjectId,
                    ref: "VehicleType",
                    required: true,
                },
            },
        ],
    },
    { timestamps: true }
);

const Transfer = model("Transfer", transferSchema);

module.exports = Transfer;
