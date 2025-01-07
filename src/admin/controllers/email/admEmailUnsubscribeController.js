const { sendErrorResponse } = require("../../../helpers");
const { EmailUnsubscriber } = require("../../../models");
const { isValidObjectId } = require("mongoose");
const fs = require("fs");
const path = require("path");
module.exports = {
    addEmailUnsubscriber: async (req, res) => {
        try {
            const { email } = req.body;

            if (!email) {
                return sendErrorResponse(res, 400, "email is required");
            }

            const emailUnsubscriber = new EmailUnsubscriber({ email: email });
            await emailUnsubscriber.save();

            res.status(200).json(emailUnsubscriber);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateEmailUnsubscriber: async (req, res) => {
        try {
            const { email } = req.body;

            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid email id");
            }

            if (!email) {
                return sendErrorResponse(res, 400, "email is required");
            }

            const existingUnsubscriber = await EmailUnsubscriber.findOne({ email: email });
            if (existingUnsubscriber) {
                return sendErrorResponse(res, 400, "email already exists");
            }

            const emailUnsubscriber = await EmailUnsubscriber.findOneAndUpdate(
                { _id: id },
                {
                    email,
                },
                { new: true, runValidators: true }
            );
            if (!emailUnsubscriber) {
                return sendErrorResponse(res, 404, "email deleted");
            }

            res.status(200).json(emailUnsubscriber);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllEmailUnsubscriber: async (req, res) => {
        try {
            const { skip = 0, limit = 10, searchQuery } = req.query;

            const filters = { isDeleted: false };

            if (searchQuery && searchQuery !== "") {
                filters.name = { $regex: searchQuery, $options: "i" };
            }

            const emailUnsubscribers = await EmailUnsubscriber.find(filters)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalemailUnsubscribers = await EmailUnsubscriber.find(filters).count();

            res.status(200).json({
                emailUnsubscribers,
                totalemailUnsubscribers,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteEmailUnsubscribe: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid email id");
            }

            const emailUnsubscriber = await EmailUnsubscriber.findOneAndDelete({
                _id: id,
            });

            if (!emailUnsubscriber) {
                return sendErrorResponse(res, 404, "email  not found");
            }

            res.status(200).json({
                message: " successfully deleted",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
