const { Schema, model } = require("mongoose");

const attractionPromotionSchema = new Schema(
    {
        attraction: {
            type: Schema.Types.ObjectId,
            required: true,
        },
    },
    { timestamps: true }
);

const AttractionPromotion = model("AttractionPromotion", attractionPromotionSchema);

module.exports = AttractionPromotion;
