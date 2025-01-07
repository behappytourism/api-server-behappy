const mongoose = require("mongoose");
const slug = require("mongoose-slug-generator");
const { Schema, model } = mongoose;

mongoose.plugin(slug);

const emailCampaignGroupSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        // startDate: {
        //     type: Date,
        //     required: true,
        // },
        // endDate: {
        //     type: Date,
        //     required: true,
        // },
    },
    { timestamps: true }
);

const EmailCampaignGroup = model("EmailCampaignGroup", emailCampaignGroupSchema);

module.exports = EmailCampaignGroup;
