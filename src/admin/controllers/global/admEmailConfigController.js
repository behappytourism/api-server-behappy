const { sendErrorResponse } = require("../../../helpers");
const { EmailConfig } = require("../../../models");
const { admEmailConfigSchema } = require("../../validations/settings/admEmailConfig.schema");
const { isValidObjectId } = require("mongoose");

module.exports = {
    updateEmailConfig: async (req, res) => {
        try {
            const { email, password, host, port, secure, product, actions, type } = req.body;
            const { _, error } = admEmailConfigSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }
            const emailConfig = await EmailConfig.findOneAndUpdate(
                { product, type },
                {
                    actions,
                    email,
                    password,
                    host,
                    port,
                    secure,
                    type,
                },
                { upsert: true, new: true } // Adding new: true to return the updated document
            );

            res.status(200).json({
                emailConfig,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleEmailConfigs: async (req, res) => {
        try {
            const { id } = req.params;
            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid driver id");
            }
            const emailConfig = await EmailConfig.findOne({ isDeleted: false, _id: id });
            if (!emailConfig) {
                return sendErrorResponse(res, 404, "email config not found");
            }
            res.status(200).json({
                emailConfig,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllEmailConfigs: async (req, res) => {
        try {
            const { type } = req.query;
            const emailConfig = await EmailConfig.find({ isDeleted: false, type });
            res.status(200).json({
                emailConfig,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteEmailConfig: async (req, res) => {
        try {
            const { id } = req.params;
            const deletedEmailConfig = await EmailConfig.findByIdAndDelete(id);
            if (!deletedEmailConfig) {
                return sendErrorResponse(res, 404, "email config not found");
            }
            res.status(200).json({
                message: "deleted successfully",
                id: id,
            });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },
};
