const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { Driver } = require("../../../models");
const { admDriverSchema } = require("../../validations/global/admDriverSchema");
const { LicenseType } = require("../../../models/transfer");

module.exports = {
    addNewDriver: async (req, res) => {
        try {
            const { availLicenseTypes } = req.body;

            const { error } = admDriverSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            if (availLicenseTypes?.length > 0) {
                for (let licType of availLicenseTypes) {
                    if (!isValidObjectId(licType)) {
                        return sendErrorResponse(res, 400, "invalid license type id");
                    }
                    const licenseType = await LicenseType.findById(licType).lean();
                    if (!licenseType) {
                        return sendErrorResponse(res, 400, "Selected license type not found");
                    }
                }
            }

            const newDriver = new Driver({
                ...req.body,
            });
            await newDriver.save();

            res.status(200).json(newDriver);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateDriver: async (req, res) => {
        try {
            const { id } = req.params;
            const { availLicenseTypes } = req.body;

            const { error } = admDriverSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            if (availLicenseTypes?.length > 0) {
                for (let licType of availLicenseTypes) {
                    if (!isValidObjectId(licType)) {
                        return sendErrorResponse(res, 400, "invalid license type id");
                    }
                    const licenseType = await LicenseType.findById(licType).lean();
                    if (!licenseType) {
                        return sendErrorResponse(res, 400, "Selected license type not found");
                    }
                }
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid driver id");
            }
            const driver = await Driver.findOneAndUpdate(
                { _id: id, isDeleted: false },
                { ...req.body },
                { runValidators: true, new: true }
            );
            if (!driver) {
                return sendErrorResponse(res, 404, "driver not found");
            }

            res.status(200).json(driver);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteDriver: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid driver id");
            }
            const driver = await Driver.findOneAndUpdate(
                { _id: id, isDeleted: false },
                { isDeleted: true }
            );
            if (!driver) {
                return sendErrorResponse(res, 404, "driver not found");
            }

            res.status(200).json({ message: "driver successfully deleted", _id: id });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllDrivers: async (req, res) => {
        try {
            const { skip = 0, limit = 10 } = req.query;

            const drivers = await Driver.find({ isDeleted: false })
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .populate("availLicenseTypes", "licenseType")
                .lean();

            const totalDrivers = await Driver.find({ isDeleted: false }).count();

            res.status(200).json({
                totalDrivers,
                skip: Number(skip),
                limit: Number(limit),
                drivers,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleDriver: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid driver id");
            }
            const driver = await Driver.findOne({ _id: id, isDeleted: false }).lean();
            if (!driver) {
                return sendErrorResponse(res, 400, "driver not found");
            }

            res.status(200).json(driver);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
