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
    isEdit: {
        type: Boolean,
        required: true,
        default: false,
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
    isEdit: {
        type: Boolean,
        required: true,
        default: false,
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
    isEdit: {
        type: Boolean,
        required: true,
        default: false,
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
    isEdit: {
        type: Boolean,
        required: true,
        default: false,
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
                    // required: true,s
                    enum: ["flat", "percentage"],
                },
                isEdit: {
                    type: Boolean,
                    required: true,
                    default: false,
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
    landAttractionMarkupType: {
        type: String,
        required: true,
        default: "flat",
        enum: ["flat", "percentage"],
    },
    landTransferMarkupType: {
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
    landTransferMarkup: {
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
    isEdit: {
        type: Boolean,
        required: true,
        default: false,
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
    isEdit: {
        type: Boolean,
        required: true,
        default: false,
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
        activities: [activitySchema],
        atoA: [atoASchema],
        visa: [visaSchema],
        hotel: [hotelSchema],
        starCategory: [starCategorySchema],
        quotation: quotationSchema,
        flight: [flightSchemas],
        insurance: [insuranceSchemas],
        transfer: [transferSchema],

        resellerId: {
            type: Schema.Types.ObjectId,
            ref: "Reseller",
            required: true,
        },
        selectedProfile: {
            type: Schema.Types.ObjectId,
            ref: "MarkupProfile",
            required: true,
        },
        isDeleted: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

const B2BMarkupProfile = model("B2bMarkupProfile", profileSchema);

module.exports = B2BMarkupProfile;
