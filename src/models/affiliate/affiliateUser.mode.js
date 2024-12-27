const { Schema, model } = require("mongoose");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const AutoIncrement = require("mongoose-sequence")(mongoose);

const affiliateUserSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        isActive: {
            type: Boolean,
            required: true,
            default: false,
        },
        affiliateCode: {
            type: Number,
        },
        isDeleted: {
            type: Boolean,
            required: true,
            default: false,
        },
        totalPoints: {
            type: Number,
            required: true,
            default: 0,
        },
        totalClicks: {
            type: Number,
            required: true,
            default: 0,
        },
    },
    { timestamps: true }
);

affiliateUserSchema.plugin(AutoIncrement, {
    inc_field: "affiliateCode",
    start_seq: 100000,
});

// affiliateUserSchema.pre("save", async function (next) {
//     if (this.isAffiliate && !this.affiliateCode) {
//         try {
//             // Find the highest existing affiliateCode and increment it
//             const highestAffiliate = await this.constructor
//                 .findOne({ isAffiliate: true }, { affiliateCode: 1 })
//                 .sort({ affiliateCode: -1 })
//                 .exec();

//             if (highestAffiliate) {
//                 this.affiliateCode = highestAffiliate.affiliateCode + 1;
//             } else {
//                 // If no existing affiliates, start with a default value
//                 this.affiliateCode = 100000;
//             }
//         } catch (error) {
//             return next(error);
//         }
//     }

//     next();
// });

const AffiliateUser = model("AffiliateUser", affiliateUserSchema);

module.exports = AffiliateUser;
