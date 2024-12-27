const { Schema, model } = require("mongoose");

const attractionTicketSettingsSchema = new Schema(
    {
        selected: {
            type: String,
        },
        samples: {
            type: [
                {
                    name: {
                        type: String,
                        required: true,
                        unique: true,
                    },
                    image: {
                        type: String,
                        required: true,
                    },
                },
            ],
        },
    },
    { timestamps: true }
);

const AttractionTicketSetting = model("AttractionTicketSetting", attractionTicketSettingsSchema);

module.exports = AttractionTicketSetting;
