const { sendErrorResponse } = require("../../../helpers");
const { AccountHead } = require("../../../models");
const { isValidObjectId } = require("mongoose");
const { accountHeadSchema } = require("../../validations/accounts/accountHead.schema ");

module.exports = {
    addAccountHead: async (req, res) => {
        try {
            const { name, shortCode } = req.body;
            const { _, error } = accountHeadSchema.validate(req.body);

            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const shortCodeCheck = await AccountHead.findOne({
                shortCode: shortCode.toUpperCase(),
                isDeleted: false,
            });

            if (shortCodeCheck) {
                return sendErrorResponse(res, 400, "short code already exists");
            }

            const newAccountHead = await AccountHead({
                name: name,
                shortCode: shortCode.toUpperCase(),
            });

            await newAccountHead.save();

            res.status(200).json({ message: "created successfully ", newAccountHead });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateAccountHead: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, shortCode } = req.body;

            const { _, error } = accountHeadSchema.validate(req.body);

            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid head id");
            }

            const shortCodeCheck = await AccountHead.findOne({
                _id: { $ne: id }, // Assuming 'id' is a variable holding the ID to exclude
                shortCode: shortCode.toUpperCase(),
                isDeleted: false,
            });

            if (shortCodeCheck) {
                return sendErrorResponse(res, 400, "short code already exists");
            }

            const accountHead = await AccountHead.findOneAndUpdate(
                { _id: id },
                {
                    name,
                    shortCode: shortCode.toUpperCase(),
                },
                { new: true }
            );

            res.status(200).json({ message: "updated successfully ", accountHead });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    listAllAccountHeads: async (req, res) => {
        try {
            const { skip = 0, limit = 10, searchQuery } = req.query;

            const filters = { isDeleted: false };

            if (searchQuery && searchQuery !== "") {
                filters.name = { $regex: searchQuery, $options: "i" };
            }

            const accountHeads = await AccountHead.find(filters)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalAccountHeads = await AccountHead.findOne(filters).count();

            res.status(200).json({
                accountHeads,
                totalAccountHeads,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
    singleAccountHead: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid head id");
            }

            const accountHead = await AccountHead.findOne({
                _id: id,
                isDeleted: false,
            });
            if (!accountHead) {
                return sendErrorResponse(res, 404, "Account head not found");
            }

            res.status(200).json(accountHead);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
    deleteAccountHead: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid account head  id");
            }

            const accountHead = await AccountHead.findOneAndDelete({
                _id: id,
                isDeleted: false,
            });
            if (!accountHead) {
                return sendErrorResponse(res, 404, "account head not found");
            }

            res.status(200).json({
                message: "account head successfully deleted",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
    getAllAccountHeads: async (req, res) => {
        try {
            const accountHeads = await AccountHead.find({ isDeleted: false })
                .sort({ createdAt: -1 })
                .lean();

            res.status(200).json(accountHeads);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
