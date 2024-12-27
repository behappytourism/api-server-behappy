const { sendErrorResponse } = require("../../../helpers");
const { VoucherSettings } = require("../../models");
const { voucherSettingsSchema } = require("../../validations/voucher/voucherSettings.schema");

module.exports = {
    updateVoucherSettings: async (req, res) => {
        try {
            const { termsAndCondition } = req.body;
            
            const { error } = voucherSettingsSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const voucherSettings = await VoucherSettings.findOneAndUpdate(
                {
                    settingsNumber: 1,
                },
                { termsAndCondition, settingsNumber: 1 },
                { upsert: true, new: true, runValidators: true }
            );

            res.status(200).json(voucherSettings);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getVoucherSettings: async (req, res) => {
        try {
            const voucherSettings = await VoucherSettings.findOne({ settingsNumber: 1 }).lean();

            res.status(200).json(voucherSettings);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
