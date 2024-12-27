const { sendErrorResponse } = require("../../../helpers");
const { AccountGroup } = require("../../../models");
const { isValidObjectId } = require("mongoose");
const { accountGroupSchema } = require("../../validations/accounts/accountGroup.schema");

module.exports = {
    addAccountGroup: async (req, res) => {
        try {
            const { name } = req.body;
            const { _, error } = accountGroupSchema.validate(req.body);

            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const newAccountGroup = await AccountGroup({
                name: name,
            });

            await newAccountGroup.save();

            res.status(200).json({ message: "created successfully ", newAccountGroup });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateAccountGroup: async (req, res) => {
        try {
            const { id } = req.params;
            const { name } = req.body;

            const { _, error } = accountGroupSchema.validate(req.body);

            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid airline id");
            }

            const accountGroup = await AccountGroup.findOneAndUpdate(
                { _id: id },
                {
                    name,
                },
                { new: true }
            );

            res.status(200).json({ message: "updated successfully ", accountGroup });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    listAllAccountGroups: async (req, res) => {
        try {
            const { skip = 0, limit = 10, searchQuery } = req.query;

            const filters = { isDeleted: false };

            if (searchQuery && searchQuery !== "") {
                filters.name = { $regex: searchQuery, $options: "i" };
            }

            const accountGroups = await AccountGroup.find(filters)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalAccountGroups = await AccountGroup.findOne(filters).count();

            res.status(200).json({
                accountGroups,
                totalAccountGroups,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
    singleAccountGroup: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid airline id");
            }

            const accountGroup = await AccountGroup.findOne({
                _id: id,
                isDeleted: false,
            });
            if (!accountGroup) {
                return sendErrorResponse(res, 404, "Account Group not found");
            }

            res.status(200).json(accountGroup);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
    deleteAccountGroup: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid account group  id");
            }

            const accountGroup = await AccountGroup.findOneAndDelete({
                _id: id,
                isDeleted: false,
            });
            if (!accountGroup) {
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
