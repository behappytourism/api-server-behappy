const { Schema, model } = require("mongoose");

const voucherV2Schema = new Schema(
    {
        voucherId: {
            type: Number,
            required: true,
        },
        voucherAmendment: {
            type: Schema.Types.ObjectId,
            ref: "VoucherAmendmentV2",
            required: true,
        },
        isDeleted: {
            type: Boolean,
            required: true,
            default: false,
        },
    },
    { timestamps: true }
);

const VoucherV2 = model("VoucherV2", voucherV2Schema);

module.exports = VoucherV2;
