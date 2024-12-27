const mongoose = require("mongoose");
const { Schema, model } = mongoose;

const AutoIncrement = require("mongoose-sequence")(mongoose);

const voucherSchema = new Schema(
    {
        voucherId: {
            type: Number,
            // required: true,
        },
        voucherAmendment: {
            type: Schema.Types.ObjectId,
            ref: "VoucherAmendment",
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

voucherSchema.plugin(AutoIncrement, {
    inc_field: "voucherId",
    start_seq: 10000,
});

const Voucher = model("Voucher", voucherSchema);

module.exports = Voucher;
