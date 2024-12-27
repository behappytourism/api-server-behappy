const { sendErrorResponse } = require("../../../helpers");
const { Banner, B2cMarkupProfile } = require("../../../models");
const { isValidObjectId } = require("mongoose");

module.exports = {
    updateB2cProfile: async (req, res) => {
        const { profileId } = req.body;

        try {
            const b2cProfile = await B2cMarkupProfile.findOneAndUpdate(
                { settingsNumber: 1 },
                {
                    selectedProfile: profileId,
                },
                {
                    upsert: true,
                    new: true,
                }
            );

            res.status(200).json(b2cProfile);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
    getB2cProfile: async (req, res) => {
        try {
            const b2cProfile = await B2cMarkupProfile.findOne({});

            res.status(200).json(b2cProfile);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
