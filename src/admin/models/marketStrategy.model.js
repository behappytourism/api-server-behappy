const { Schema, model } = require("mongoose");

const attractionSchema = new Schema({
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
});

const activitySchema = new Schema({
    activity: {
        type: Schema.Types.ObjectId,
        ref: "AttractionActivity",
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
    transferMarkup: {
        type: Number,
        // required: true,
        default: 0,
    },
    transferMarkupType: {
        type: String,
        // required: true,
        enum: ["flat", "percentage"],
    },
});

const atoASchema = new Schema({
    atoa: {
        type: Schema.Types.ObjectId,
        ref: "B2BA2a",
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
});

const visaSchema = new Schema({
    visa: {
        type: Schema.Types.ObjectId,
        ref: "VisaType",
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
});

const starCategorySchema = new Schema({
    name: {
        type: String,
        required: true,
    },
    markups: [
        {
            hotelProviderId: {
                type: Schema.Types.ObjectId,
                // required: true,
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
    markup: {
        type: Number,
        // required: true,
        default: 0,
    },
    markupType: {
        type: String,
        // required: true,
        enum: ["flat", "percentage"],
    },
    markupApi: {
        type: Number,
        // required: true,
        default: 0,
    },
    markupTypeApi: {
        type: String,
        // required: true,
        enum: ["flat", "percentage"],
    },
});

const hotelSchema = new Schema({
    hotelId: {
        type: Schema.Types.ObjectId,
        ref: "Hotel",
        required: true,
    },

    hotelMarkup: [
        {
            hotelProviderId: {
                type: Schema.Types.ObjectId,
                // required: true,
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

    roomTypes: {
        type: [
            {
                hotelProviderId: {
                    type: Schema.Types.ObjectId,
                    // required: true,
                },
                roomTypeId: {
                    type: Schema.Types.ObjectId,
                    ref: "RoomType",
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
                markupApi: {
                    type: Number,
                    // required: true,
                    default: 0,
                },
                markupTypeApi: {
                    type: String,
                    // required: true,
                    enum: ["flat", "percentage"],
                },
            },
        ],
    },
});

const quotationSchema = new Schema({
    hotelMarkupType: {
        type: String,
        required: true,
        enum: ["flat", "percentage"],
    },
    hotelMarkup: {
        type: Number,
        required: true,
        default: 0,
    },
    landmarkMarkupType: {
        type: String,
        required: true,
        enum: ["flat", "percentage"],
    },
    landmarkMarkup: {
        type: Number,
        required: true,
        default: 0,
    },
    visaMarkupType: {
        type: String,
        required: true,
        enum: ["flat", "percentage"],
    },
    visaMarkup: {
        type: Number,
        required: true,
        default: 0,
    },
});

const flightSchemas = new Schema({
    airlineCode: {
        type: String,
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
});

const insuranceSchemas = new Schema({
    insuranceId: {
        type: String,
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
});

const transferSchema = new Schema({
    transferId: {
        type: String,
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
});

const profileSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        attraction: attractionSchema,
        activities: [activitySchema],
        atoA: [atoASchema],
        visa: [visaSchema],
        quotation: quotationSchema,
        hotel: [hotelSchema],
        starCategory: [starCategorySchema],
        flight: [flightSchemas],
        insurance: [insuranceSchemas],
        transfer: [transferSchema],
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

const MarketStrategy = model("MarketStrategy", profileSchema);

module.exports = MarketStrategy;
