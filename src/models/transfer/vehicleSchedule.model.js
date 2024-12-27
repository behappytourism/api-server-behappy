const { Schema, model } = require("mongoose");

const vehicleScheduleSchema = new Schema(
    {
        vehicleId: {
            type: Schema.Types.ObjectId,
            ref: "Vehicle",
            required: true,
        },
        driverId: {
            type: Schema.Types.ObjectId,
            ref: "Driver",
            required: true,
        },
        utcOffset: {
            type: Number,
            required: true,
        },
        fromISODateTime: {
            type: Date,
            required: true,
        },
        bufferedFromISODateTime: {
            type: Date,
            required: true,
        },
        bufferedToISODateTime: {
            type: Date,
            required: true,
        },
        type: {
            type: String,
            lowercase: true,
            required: true,
            enum: ["tour"],
        },
        voucherId: {
            type: Schema.Types.ObjectId,
            ref: "VoucherV2",
            required: function () {
                return this.type === "tour";
            },
        },
        voucherAmendmentId: {
            type: Schema.Types.ObjectId,
            ref: "VoucherAmendmentV2",
            required: function () {
                return this.type === "tour";
            },
        },
        tourId: {
            type: Schema.Types.ObjectId,
            required: function () {
                return this.type === "tour";
            },
        },
        isDeleted: {
            type: Boolean,
            required: true,
            default: false,
        },
    },
    { timestamps: true }
);

const VehicleSchedule = model("VehicleSchedule", vehicleScheduleSchema);

module.exports = VehicleSchedule;
