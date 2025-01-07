const { isValidObjectId } = require("mongoose");
const { sendErrorResponse } = require("../../../helpers");
const { EmailFooter } = require("../../../models");

module.exports = {
    addNewEmailFooter: async (req, res) => {
        try {
            const { html, name } = req.body;

            const newEmailFooter = new EmailFooter({
                html,
                name,
            });
            await newEmailFooter.save();

            res.status(200).json({
                message: "new emailFooter added successfully",
                _id: newEmailFooter._id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateEmailFooter: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid emailFooter id");
            }
            const { html, name } = req.body;

            const emailFooter = await EmailFooter.findOneAndUpdate(
                { _id: id, isDeleted: false },
                {
                    html,
                    name,
                },
                { new: true, runValidators: true }
            );
            if (!emailFooter) {
                return sendErrorResponse(res, 404, "emailFooter not found");
            }

            res.status(200).json({
                message: "EmailFooter successfully updated",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteEmailFooter: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid emailFooter id");
            }

            const emailFooter = await EmailFooter.findOneAndDelete({
                _id: id,
                isDeleted: false,
            });
            if (!emailFooter) {
                return sendErrorResponse(res, 404, "emailFooter not found");
            }

            res.status(200).json({
                message: "emailFooter successfully deleted",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllEmailFooters: async (req, res) => {
        try {
            const { skip = 0, limit = 10, searchQuery } = req.query;

            const filters = { isDeleted: false };

            if (searchQuery && searchQuery !== "") {
                filters.emailFooterName = { $regex: searchQuery, $options: "i" };
            }

            const emailFooters = await EmailFooter.find(filters)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalEmailFooters = await EmailFooter.findOne(filters).count();

            res.status(200).json({
                emailFooters,
                totalEmailFooters,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleEmailFooter: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid emailFooter id");
            }

            const emailFooter = await EmailFooter.findOne({
                _id: id,
                isDeleted: false,
            });
            if (!emailFooter) {
                return sendErrorResponse(res, 404, "emailFooter not found");
            }

            res.status(200).json(emailFooter);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllEmailFootersList: async (req, res) => {
        try {
            const emailFooters = await EmailFooter.find({
                isDeleted: false,
            });

            res.status(200).json(emailFooters || []);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
