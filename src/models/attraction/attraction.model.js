const mongoose = require("mongoose");
const slug = require("mongoose-slug-generator");
const { Schema, model } = require("mongoose");

const { Counter } = require("../global");

mongoose.plugin(slug);

const attractionSchema = new Schema(
    {
        code: {
            type: Number,
            unique: true,
        },
        destination: {
            type: Schema.Types.ObjectId,
            ref: "Destination",
            required: true,
        },
        logo: {
            type: String,
        },
        title: {
            type: String,
            required: true,
        },
        slug: {
            type: String,
            slug: ["title"],
            unique: true,
        },
        category: {
            type: Schema.Types.ObjectId,
            ref: "AttractionCategory",
            required: true,
        },
        bookingType: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["booking", "ticket"],
        },
        bookingPriorDays: {
            type: Number,
            required: function () {
                return this.bookingType === "booking";
            },
        },
        isCustomDate: {
            type: Boolean,
            required: true,
        },
        startDate: {
            type: Date,
            required: function () {
                return this.isCustomDate === true;
            },
        },
        endDate: {
            type: Date,
            required: function () {
                return this.isCustomDate === true;
            },
        },
        availability: {
            type: [
                {
                    isEnabled: {
                        type: Boolean,
                        required: true,
                    },
                    day: {
                        type: String,
                        lowercase: true,
                        required: true,
                    },
                    open: {
                        type: String,
                        required: function () {
                            return this.isEnabled === true;
                        },
                    },
                    close: {
                        type: String,
                        required: function () {
                            return this.isEnabled === true;
                        },
                    },
                },
            ],
        },
        offDates: {
            type: [
                {
                    from: {
                        type: Date,
                        required: true,
                    },
                    to: {
                        type: Date,
                        required: true,
                    },
                },
            ],
        },
        durationType: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["hours", "days", "months"],
        },
        duration: {
            type: Number,
            required: true,
        },
        durationInSeconds: {
            type: Number,
            required: true,
        },
        isActive: {
            type: Boolean,
            required: true,
            default: true,
        },
        isB2cActive: {
            type: Boolean,
            required: true,
            default: true,
        },
        isB2bActive: {
            type: Boolean,
            required: true,
            default: true,
        },
        mapLink: {
            type: String,
        },
        isOffer: {
            type: Boolean,
            required: true,
        },
        offerAmountType: {
            type: String,
            required: function () {
                return this.offer === true;
            },
            enum: ["flat", "percentage"],
            lowercase: true,
        },
        offerAmount: {
            type: Number,
            required: function () {
                return this.offer === true;
            },
        },
        youtubeLink: {
            type: String,
            required: true,
        },
        images: {
            type: [{ type: String, required: true }],
            required: true,
        },
        highlights: {
            type: String,
            required: true,
        },
        itineraryDescription: {
            type: String,
        },
        sections: {
            type: [
                {
                    title: {
                        type: String,
                        required: true,
                    },
                    body: {
                        type: String,
                        required: true,
                    },
                },
            ],
        },
        faqs: {
            type: [
                {
                    question: {
                        type: String,
                        required: true,
                    },
                    answer: {
                        type: String,
                        required: true,
                    },
                },
            ],
        },
        isApiConnected: {
            type: Boolean,
            required: true,
        },
        connectedApi: {
            type: Schema.Types.ObjectId,
            required: function () {
                return this.isApiConnected === true;
            },
        },
        cancellationType: {
            type: String,
            required: true,
            enum: ["nonRefundable", "freeCancellation", "cancelWithFee"],
        },
        cancelBeforeTime: {
            type: Number,
            required: function () {
                return (
                    this.cancellationType === "freeCancellation" ||
                    this.cancellationType === "cancelWithFee"
                );
            },
        },
        cancellationFee: {
            type: Number,
            required: function () {
                return this.cancellationType === "cancelWithFee";
            },
        },
        isDeleted: {
            type: Boolean,
            required: true,
            default: false,
        },
        isCombo: {
            type: Boolean,
            required: true,
        },
        country: {
            type: Schema.Types.ObjectId,
            ref: "Country",
            required: true,
        },
        countryCode: {
            type: String,
            required: true,
        },
        state: {
            type: Schema.Types.ObjectId,
            ref: "State",
            required: true,
        },
        city: {
            type: Schema.Types.ObjectId,
            ref: "City",
            required: true,
        },
        area: {
            type: Schema.Types.ObjectId,
            ref: "Area",
            // required: true,
        },
        latitude: {
            type: String,
            required: true,
        },
        longitude: {
            type: String,
            required: true,
        },
        // This is for ordering attraction by a custom order
        displayOrder: {
            type: Number,
            required: true,
            default: 1,
        },
    },
    { timestamps: true }
);

attractionSchema.pre("save", async function (next) {
    if (!this.code) {
        try {
            const counterDoc = await Counter.findOneAndUpdate(
                { identifier: "attraction" },
                { $inc: { seq: 1 } },
                { new: true, upsert: true }
            );

            this.code = counterDoc.seq;

            next();
        } catch (error) {
            next(error);
        }
    } else {
        next();
    }
});

attractionSchema.virtual("activities", {
    ref: "AttractionActivity",
    localField: "_id",
    foreignField: "attraction",
});

const Attraction = model("Attraction", attractionSchema);

module.exports = Attraction;
