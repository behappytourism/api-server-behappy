const { sendErrorResponse } = require("../../../helpers");
const { AccountNature } = require("../../../models");
const { isValidObjectId } = require("mongoose");
const { accountNatureSchema } = require("../../validations/accounts/accountNature.schema");

module.exports = {
    addAccountNature: async (req, res) => {
        try {
            const { name, shortCode } = req.body;
            const { _, error } = accountNatureSchema.validate(req.body);

            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const shortCodeCheck = await AccountNature.findOne({
                shortCode: shortCode.toUpperCase(),
                isDeleted: false,
            });

            if (shortCodeCheck) {
                return sendErrorResponse(res, 400, "short code already exists");
            }

            const newAccountNature = await AccountNature({
                name: name,
                shortCode: shortCode.toUpperCase(),
            });

            await newAccountNature.save();

            res.status(200).json({ message: "created successfully ", newAccountNature });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    updateAccountNature: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, shortCode } = req.body;

            const { _, error } = accountNatureSchema.validate(req.body);

            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid  id");
            }

            const shortCodeCheck = await AccountNature.findOne({
                _id: { $ne: id }, // Assuming 'id' is a variable holding the ID to exclude
                shortCode: shortCode.toUpperCase(),
                isDeleted: false,
            });

            if (shortCodeCheck) {
                return sendErrorResponse(res, 400, "short code already exists");
            }

            const accountNature = await AccountNature.findOneAndUpdate(
                { _id: id },
                {
                    name,
                    shortCode: shortCode.toUpperCase(),
                },
                { new: true }
            );

            res.status(200).json({ message: "updated successfully ", accountNature });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    listAllAccountNatures: async (req, res) => {
        try {
            const { skip = 0, limit = 10, searchQuery } = req.query;

            const filters = { isDeleted: false };

            if (searchQuery && searchQuery !== "") {
                filters.name = { $regex: searchQuery, $options: "i" };
            }

            const accountNatures = await AccountNature.find(filters)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalAccountNatures = await AccountNature.findOne(filters).count();

            res.status(200).json({
                accountNatures,
                totalAccountNatures,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
    singleAccountNature: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid nature id");
            }

            const accountNature = await AccountNature.findOne({
                _id: id,
                isDeleted: false,
            });
            if (!accountNature) {
                return sendErrorResponse(res, 404, "Account Nature not found");
            }

            res.status(200).json(accountNature);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
    deleteAccountNature: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid account nature  id");
            }

            const accountNature = await AccountNature.findOneAndDelete({
                _id: id,
                isDeleted: false,
            });
            if (!accountNature) {
                return sendErrorResponse(res, 404, "account nature not found");
            }

            res.status(200).json({
                message: "account nature successfully deleted",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
    getAllAccountNature: async (req, res) => {
        try {
            const accountNatures = await AccountNature.find({ isDeleted: false })
                .sort({ createdAt: -1 })
                .lean();

            res.status(200).json(accountNatures);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
