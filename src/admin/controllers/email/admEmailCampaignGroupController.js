const { sendErrorResponse } = require("../../../helpers");
const { EmailCampaignGroup, EmailList, EmailTemplate } = require("../../../models");
const { isValidObjectId } = require("mongoose");
const fs = require("fs");
const path = require("path");
const { emailCampaignGroupSchema } = require("../../validations/email/emailCampaignGroup.schema");
module.exports = {
    addNewEmailCampaignGroup: async (req, res) => {
        try {
            const { name, startDate, endDate } = req.body;

            const { _, error } = emailCampaignGroupSchema.validate({
                ...req.body,
            });

            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const emailCampaignGroup = new EmailCampaignGroup({
                name,
                // startDate,
                // endDate,
            });

            await emailCampaignGroup.save();
            res.status(200).json(emailCampaignGroup);
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    updateEmailCampaignGroup: async (req, res) => {
        try {
            const { id } = req.params;

            const { name, startDate, endDate } = req.body;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid airline id");
            }

            const { _, error } = emailCampaignGroupSchema.validate({
                ...req.body,
            });
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const emailCampaignGroup = await EmailCampaignGroup.findOneAndUpdate(
                { _id: id, isDeleted: false },
                {
                    name,
                    // startDate,
                    // endDate,
                },
                { new: true, runValidators: true }
            );
            if (!emailCampaignGroup) {
                return sendErrorResponse(res, 404, "email list not found");
            }

            res.status(200).json(emailCampaignGroup);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteEmailCampaignGroup: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid email id");
            }

            const emailCampaignGroup = await EmailCampaignGroup.findOneAndDelete({
                _id: id,
                isDeleted: false,
            });
            if (!emailCampaignGroup) {
                return sendErrorResponse(res, 404, "email group not found");
            }

            res.status(200).json({
                message: "email campaign group successfully deleted",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllEmailCampaignGroup: async (req, res) => {
        try {
            const { skip = 0, limit = 10, searchQuery } = req.query;

            const filters = { isDeleted: false };

            if (searchQuery && searchQuery !== "") {
                filters.name = { $regex: searchQuery, $options: "i" };
            }

            const emailCampaignGroups = await EmailCampaignGroup.find(filters)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalemailCampaignGroups = await EmailCampaignGroup.find(filters).count();

            res.status(200).json({
                emailCampaignGroups,
                totalemailCampaignGroups,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleEmailCampaignGroup: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid airline id");
            }

            const emailCampaignGroup = await EmailCampaignGroup.findOne({
                _id: id,
                isDeleted: false,
            });
            if (!emailCampaignGroup) {
                return sendErrorResponse(res, 404, "email list not found");
            }

            res.status(200).json(emailCampaignGroup);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
