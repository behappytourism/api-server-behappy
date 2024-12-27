const { Schema, model } = require("mongoose");

const hotelLogSchema = new Schema(
    {
        processName: { type: String },
        stepNumber: { type: Number },
        stepName: { type: String },
        comment: { type: String },
        actionUrl: { type: String },
        requestJson: { type: String },
        responseJson: { type: String },
        processId: { type: String },
        userId: { type: Schema.Types.ObjectId },
    },
    { timestamps: true }
);

const HotelLog = model("HotelLog", hotelLogSchema);

module.exports = HotelLog;
