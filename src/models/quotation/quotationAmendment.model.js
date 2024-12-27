const { Schema, model } = require("mongoose");

const quotationAmendmentSchema = new Schema(
    {
        clientName: {
            type: String,
            required: true,
        },
        noOfAdults: {
            type: Number,
        },
        noOfChildren: {
            type: Number,
        },
        childrenAges: {
            type: [
                {
                    type: String,
                },
            ],
        },
        checkInDate: {
            type: Date,
            required: true,
        },
        checkOutDate: {
            type: Date,
            required: true,
        },
        noOfNights: {
            type: Number,
            required: true,
        },
        paxType: {
            type: String,
            required: true,
        },
        isArrivalAirportDisabled: {
            type: Boolean,
            required: true,
        },

        arrivalTerminalId: {
            type: String,
            required: function () {
                return this.isArrivalAirportDisabled === false;
            },
        },
        arrivalTerminalCode: {
            type: String,
            required: function () {
                return this.isArrivalAirportDisabled === false;
            },
        },
        arrivalAirport: {
            type: Schema.Types.ObjectId,
            ref: "Aiport",
            required: function () {
                return this.isArrivalAirportDisabled === false;
            },
        },
        arrivalIataCode: {
            type: String,
        },
        arrivalAirportName: {
            type: String,
        },
        isDepartureAirportDisabled: {
            type: Boolean,
            required: true,
        },
        departureAirport: {
            type: Schema.Types.ObjectId,
            ref: "Aiport",
            required: function () {
                return this.isDepartureAirportDisabled === false;
            },
        },
        departureIataCode: {
            type: String,
        },
        departureAirportName: {
            type: String,
        },
        departureTerminalId: {
            type: String,
            required: function () {
                return this.isDepartureAirportDisabled === false;
            },
        },
        departureTerminalCode: {
            type: String,
            required: function () {
                return this.isDepartureAirportDisabled === false;
            },
        },
        isHotelQuotationDisabled: {
            type: Boolean,
            required: true,
        },
        hotelDisabledRemark: {
            type: String,
        },
        hotelQuotation: {
            type: Schema.Types.ObjectId,
            ref: "HotelQuotation",
            required: function () {
                return this.isHotelQuotationDisabled === false;
            },
        },

        // hotelTransfer: {
        //     type: Schema.Types.ObjectId,
        //     ref: "HotelTransfer",
        //     required: function () {
        //         return this.isHotelQuotationDisabled === false;
        //     },
        // },
        isExcursionQuotationDisabled: {
            type: Boolean,
            required: true,
        },
        isSupplimentQuotationDisabled: {
            type: Boolean,
            required: true,
        },
        isTransferQuotationDisabled: {
            type: Boolean,
            required: true,
        },
        isGuideQuotationDisabled: {
            type: Boolean,
            required: true,
            default: true,
        },
        isAlreadyBooked: {
            type: Boolean,
            required: true,
            default: false,
        },
        transferQuotation: {
            type: Schema.Types.ObjectId,
            ref: "TransferQuotation",
            required: function () {
                return this.isTransferQuotationDisabled === false;
            },
        },
        excursionQuotation: {
            type: Schema.Types.ObjectId,
            ref: "ExcursionQuotation",
            required: function () {
                return this.isExcursionQuotationDisabled === false;
            },
        },
        excSupplementQuotation: {
            type: Schema.Types.ObjectId,
            ref: "ExcSupplementsQuotation",
            required: function () {
                return this.isSupplimentQuotationDisabled === false;
            },
        },
        guideQuotation: {
            type: Schema.Types.ObjectId,
            ref: "GuideQuotation",
            required: function () {
                return this.isGuideQuotationDisabled === false;
            },
        },
        createdBy: {
            type: String,
            enum: ["admin", "reseller"],
            lowercase: true,
        },
        isResellerDisabled: {
            type: Boolean,
            required: true,
            default: false,
        },
        reseller: {
            type: Schema.Types.ObjectId,
            ref: "Reseller",
            required: function () {
                return this.createdBy === "reseller" || this.isResellerDisabled === false;
            },
        },
        quotationNumber: {
            type: Number,
            required: true,
        },
        sheet: { type: String },
        quotationCurrency: {
            type: String,
            enum: ["AED", "USD"],
            uppercase: true,
            required: true,
        },
        // markup: {
        //     type: Number,
        //     required: true,
        // },
        // markupType: {
        //     type: String,
        //     lowercase: true,
        //     enum: ["flat", "percentage"],
        //     required: true,
        // },
        isVisaQuotationDisabled: {
            type: Boolean,
            required: true,
        },

        isVisaNeeded: {
            type: Boolean,
            required: true,
        },
        visa: {
            visaId: {
                type: Schema.Types.ObjectId,
                ref: "VisaType",
                required: function () {
                    return this.isVisaNeeded === true;
                },
            },
            name: {
                type: String,
                required: function () {
                    return this.isVisaNeeded === true;
                },
            },
            nationality: {
                type: Schema.Types.ObjectId,
                ref: "VisaNationality",
                required: function () {
                    return this.isVisaNeeded === true;
                },
            },
            adultPrice: {
                type: Number,
                required: function () {
                    return this.isVisaNeeded === true;
                },
            },
            adultProfileMarkup: {
                type: Number,
                required: function () {
                    return this.isVisaNeeded === true;
                },
            },
            adultMarketMarkup: {
                type: Number,
                required: function () {
                    return this.isVisaNeeded === true;
                },
            },
            childPrice: {
                type: Number,
                required: function () {
                    return this.isVisaNeeded === true;
                },
            },
            childProfileMarkup: {
                type: Number,
                required: function () {
                    return this.isVisaNeeded === true;
                },
            },
            childMarketMarkup: {
                type: Number,
                required: function () {
                    return this.isVisaNeeded === true;
                },
            },
            otbPrice: {
                type: Number,
                required: function () {
                    return this.isVisaNeeded === true;
                },
            },
            // ppTotalPrice: {
            //     type: Number,
            //     required: function () {
            //         return this.isVisaNeeded === true;
            //     },
            // },
        },
        perPersonAdultPrice: {
            type: Number,
            required: true,
        },
        perPersonChildPrice: {
            type: Number,
            required: true,
        },
        perPersonAdultMarketMarkup: {
            type: Number,
            required: true,
        },
        perPersonAdultProfileMarkup: {
            type: Number,
            required: true,
        },
        perPersonChildMarketMarkup: {
            type: Number,
            required: true,
        },
        perPersonChildProfileMarkup: {
            type: Number,
            required: true,
        },
        isCustomMarkup: {
            type: Boolean,
            required: true,
            default: false,
        },
        customMarkup: {
            type: Number,
            required: function () {
                return this.isCustomMarkup === true;
            },
        },
        customMarkupType: {
            type: String,
            enum: ["flat", "percentage"],
            required: function () {
                return this.isCustomMarkup === true;
            },
        },
        pdf: {
            type: String,
        },
        confirmedBy: {
            type: String,
            enum: ["admin", "reseller"],
            lowercase: true,
            required: function () {
                return this.status === "confirmed";
            },
        },
        status: {
            type: String,
            enum: ["confirmed", "not-confirmed"],
            lowercase: true,
            required: true,
        },
        comments: {
            type: String,
        },
        pickupPlaceId: {
            type: String,
        },
        pickupNote: {
            type: String,
        },
        isTourismFeeIncluded: {
            type: Boolean,
            required: true,
            default: false,
        },
    },
    { timestamps: true }
);

const QuotationAmendment = model("QuotationAmendment", quotationAmendmentSchema);

module.exports = QuotationAmendment;
