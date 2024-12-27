const { sendErrorResponse } = require("../../../helpers");
const { AccountGlCode } = require("../../../models");
const { isValidObjectId } = require("mongoose");
const { accountGlCodeSchema } = require("../../validations/accounts/accountGlCode.schema");

module.exports = {
    addAccountGlCode: async (req, res) => {
        try {
            const { headId, natureId, name, shortCode } = req.body;
            const { _, error } = accountGlCodeSchema.validate(req.body);

            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const shortCodeCheck = await AccountGlCode.findOne({
                shortCode: shortCode.toUpperCase(),
                isDeleted: false,
            });

            if (shortCodeCheck) {
                return sendErrorResponse(res, 400, "short code already exists");
            }

            const newAccountGlCode = await AccountGlCode({
                headId,
                natureId,
                name,
                shortCode,
            });

            await newAccountGlCode.save();

            res.status(200).json({ message: "created successfully ", newAccountGlCode });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateAccountGlCode: async (req, res) => {
        try {
            const { id } = req.params;
            const { headId, natureId, name, shortCode } = req.body;

            const { _, error } = accountGlCodeSchema.validate(req.body);

            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid airline id");
            }

            const shortCodeCheck = await AccountGlCode.findOne({
                _id: { $ne: id }, // Assuming 'id' is a variable holding the ID to exclude
                shortCode: shortCode.toUpperCase(),
                isDeleted: false,
            });

            if (shortCodeCheck) {
                return sendErrorResponse(res, 400, "short code already exists");
            }

            const AccountGlCode = await AccountGlCode.findOneAndUpdate(
                { _id: id },
                {
                    headId,
                    natureId,
                    name,
                    shortCode,
                },
                { new: true }
            );

            res.status(200).json({ message: "updated successfully ", AccountGlCode });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    listAllAccountGlCodes: async (req, res) => {
        try {
            const { skip = 0, limit = 10, searchQuery } = req.query;

            const filters = { isDeleted: false };

            if (searchQuery && searchQuery !== "") {
                filters.name = { $regex: searchQuery, $options: "i" };
            }

            const accountGlCodes = await AccountGlCode.find(filters)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalAccountGlCodes = await AccountGlCode.findOne(filters).count();

            res.status(200).json({
                accountGlCodes,
                totalAccountGlCodes,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
    singleAccountGlCode: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid airline id");
            }

            const AccountGlCode = await AccountGlCode.findOne({
                _id: id,
                isDeleted: false,
            });
            if (!AccountGlCode) {
                return sendErrorResponse(res, 404, "Account Group not found");
            }

            res.status(200).json(AccountGlCode);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteAccountGlCode: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid account group  id");
            }

            const AccountGlCode = await AccountGlCode.findOneAndDelete({
                _id: id,
                isDeleted: false,
            });
            if (!AccountGlCode) {
                return sendErrorResponse(res, 404, "account group not found");
            }

            res.status(200).json({
                message: "account group successfully deleted",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
