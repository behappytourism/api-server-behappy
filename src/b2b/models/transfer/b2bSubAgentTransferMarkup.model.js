const { Schema, model } = require("mongoose");

const b2bSubAgentTransferMarkupSchema = new Schema(
    {
        transferId: {
            type: Schema.Types.ObjectId,
            ref: "Transfer",
            required: true,
        },
        vehicleType: {
            type: [
                {
                    vehicleId: {
                        type: Schema.Types.ObjectId,
                        ref: "VehicleType",
                        required: true,
                    },
                    markup: {
                        type: Number,
                        required: true,
                        default: 0,
                    },
                    markupType: {
                        type: String,
                        required: true,
                        enum: ["flat", "percentage"],
                    },
                },
            ],
        },
        resellerId: {
            type: Schema.Types.ObjectId,
            ref: "Reseller",
            required: true,
        },
    },
    { timestamps: true }
);

const B2BSubAgentTransferMarkup = model(
    "B2BSubAgentTransferMarkup",
    b2bSubAgentTransferMarkupSchema
);

module.exports = B2BSubAgentTransferMarkup;
