const { Schema, model } = require("mongoose");

const b2bClientTransferMarkupSchema = new Schema(
    {
        markupType: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["flat", "percentage"],
        },
        markup: {
            type: Number,
            required: true,
        },
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

const B2BClientTransferMarkup = model("B2BClientTransferMarkup", b2bClientTransferMarkupSchema);

module.exports = B2BClientTransferMarkup;
