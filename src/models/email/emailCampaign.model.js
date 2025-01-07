const mongoose = require("mongoose");
const slug = require("mongoose-slug-generator");
const { Schema, model } = mongoose;

mongoose.plugin(slug);

const eamilCampaignSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
        },
        campaignGroupId: {
            type: Schema.Types.ObjectId,
            ref: "EmailCampaignGroup",
            required: true,
        },
        date: {
            type: Date,
            required: true,
        },
        hour: {
            type: Number,
            required: true,
        },
        min: {
            type: Number,
            required: true,
        },
        emailListId: [
            {
                type: Schema.Types.ObjectId,
                ref: "EmailList",
                required: true,
            },
        ],
        emailTemplateId: {
            type: Schema.Types.ObjectId,
            ref: "EmailTemplate",
            required: true,
        },
        status: {
            type: String,
            required: true,
            enum: ["scheduled", "started", "stopped", "paused", "completed"],
            default: "scheduled",
        },
        isActive: {
            type: Boolean,
            required: false,
            default: true,
        },
        isDeleted: {
            type: Boolean,
            required: false,
            default: false,
        },
        subject: {
            type: String,
            required: true,
        },
        tags: {
            type: [
                {
                    key: { type: String, required: true },
                    type: { type: String, required: true },
                    value: {
                        type: String,
                        // required: function () {
                        //     return this.type === "string";
                        // },
                    },
                    image: {
                        type: Schema.Types.ObjectId,
                        ref: "EmailImage",
                        // required: function () {
                        //     return this.type === "image";
                        // },
                    },
                },
            ],
        },
        emails: {
            type: [],
        },
        hashedCampaignId: {
            type: String,
        },
        emailConfigId: { type: Schema.Types.ObjectId, ref: "EmailConfig", required: true },
        emailFooterId: { type: Schema.Types.ObjectId, ref: "EmailFooter", required: true },
    },
    { timestamps: true }
);

const EmailCampaign = model("EmailCampaign", eamilCampaignSchema);

module.exports = EmailCampaign;
