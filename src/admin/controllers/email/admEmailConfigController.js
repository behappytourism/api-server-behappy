const { isValidObjectId } = require("mongoose");
const { sendErrorResponse } = require("../../../helpers");
const { EmailConfig } = require("../../../models");

module.exports = {
    addNewEmailConfig: async (req, res) => {
        try {
            const { name, email, password, host, port } = req.body;

            const newEmailConfig = new EmailConfig({
                name,
                email,
                password,
                host,
                port,
            });

            await newEmailConfig.save();

            res.status(200).json({
                message: "new EmailConfig added successfully",
                _id: newEmailConfig._id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateEmailConfig: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid EmailConfig id");
            }

            const { name, email, password, host, port } = req.body;

            const emailConfig = await EmailConfig.findOneAndUpdate(
                { _id: id, isDeleted: false },
                {
                    name,
                    email,
                    password,
                    host,
                    port,
                },
                { new: true, runValidators: true }
            );
            if (!emailConfig) {
                return sendErrorResponse(res, 404, "EmailConfig not found");
            }

            res.status(200).json({
                message: "EmailConfig successfully updated",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteEmailConfig: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid EmailConfig id");
            }

            const emailConfig = await EmailConfig.findOneAndDelete({
                _id: id,
                isDeleted: false,
            });
            if (!emailConfig) {
                return sendErrorResponse(res, 404, "EmailConfig not found");
            }

            res.status(200).json({
                message: "EmailConfig successfully deleted",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllEmailConfigs: async (req, res) => {
        try {
            const { skip = 0, limit = 10, searchQuery } = req.query;

            const filters = { isDeleted: false };

            if (searchQuery && searchQuery !== "") {
                filters.EmailConfigName = { $regex: searchQuery, $options: "i" };
            }

            const emailConfigs = await EmailConfig.find(filters)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalEmailConfigs = await EmailConfig.findOne(filters).count();

            res.status(200).json({
                emailConfigs,
                totalEmailConfigs,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleEmailConfig: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid EmailConfig id");
            }

            const emailConfig = await EmailConfig.findOne({
                _id: id,
                isDeleted: false,
            });

            if (!emailConfig) {
                return sendErrorResponse(res, 404, "EmailConfig not found");
            }

            res.status(200).json(emailConfig);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllEmailConfigsList: async (req, res) => {
        try {
            const emailConfig = await EmailConfig.find({
                isDeleted: false,
            });

            res.status(200).json(emailConfig || []);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
