const { Schema, model } = require("mongoose");

const burjKhalifaLogSchema = new Schema(
    {
        processName: { type: String },
        stepNumber: { type: Number },
        stepName: { type: String },
        comment: { type: String },
        actionUrl: { type: String },
        request: { type: String },
        response: {},
        referenceNumber: { type: String },
        userId: { type: Schema.Types.ObjectId },
    },
    { timestamps: true }
);

const BurjKhalifaLog = model("BurjKhalifaLog", burjKhalifaLogSchema);

module.exports = BurjKhalifaLog;
