const { Schema, model } = require("mongoose");

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
        default: "flat",
        enum: ["flat", "percentage"],
    },
    hotelMarkup: {
        type: Number,
        required: true,
        default: 0,
    },
    landTransferMarkupType: {
        type: String,
        required: true,
        default: "flat",
        enum: ["flat", "percentage"],
    },
    landTransferMarkup: {
        type: Number,
        required: true,
        default: 0,
    },
    landAttractionMarkupType: {
        type: String,
        required: true,
        default: "flat",
        enum: ["flat", "percentage"],
    },
    landAttractionMarkup: {
        type: Number,
        required: true,
        default: 0,
    },
    visaMarkupType: {
        type: String,
        required: true,
        default: "flat",
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
        activities: [activitySchema],
        atoA: [atoASchema],
        visa: [visaSchema],
        quotation: quotationSchema,
        hotel: [hotelSchema],
        starCategory: [starCategorySchema],
        flight: [flightSchemas],
        insurance: [insuranceSchemas],
        transfer: [transferSchema],

        resellerIds: [
            {
                type: String,
            },
        ],
        transfer: [transferSchema],

        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

const MarkupProfile = model("MarkupProfile", profileSchema);

module.exports = MarkupProfile;
