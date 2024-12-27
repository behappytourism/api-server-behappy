const { sendErrorResponse } = require("../../../helpers");
const B2BGlobalConfiguration = require("../../models/b2bGlobalConfiguration.model");
const {
    upserB2bConfigurationsSchema,
} = require("../../validations/global/b2bGlobalConfiguration.schema");

module.exports = {
    upsertB2bConfigurations: async (req, res) => {
        try {
            const { oldImages } = req.body;

            const { error } = upserB2bConfigurationsSchema.validate({
                ...req.body,
                oldImages: oldImages ? JSON.parse(oldImages) : [],
            });
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            let parsedOldImages = [];
            if (oldImages) {
                parsedOldImages = JSON.parse(oldImages);
            }

            let newImages = [...parsedOldImages];
            for (let i = 0; i < req.files?.length; i++) {
                const img = "/" + req.files[i]?.path?.replace(/\\/g, "/");
                newImages.push(img);
            }

            const configuration = await B2BGlobalConfiguration.findOneAndUpdate(
                { settingsNumber: 1 },
                {
                    settingsNumber: 1,
                    hotelBackgroundImages: newImages,
                    ...req.body,
                },
                { runValidators: true, upsert: true, new: true }
            );

            res.status(200).json({
                message: "hotel background images successfully uploaded",
                settingsNumber: configuration.settingsNumber,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getB2bConfigurationData: async (req, res) => {
        try {
            const configuration = await B2BGlobalConfiguration.findOne({
                settingsNumber: 1,
            }).lean();

            res.status(200).json(configuration);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
