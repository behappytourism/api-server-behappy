const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { LicenseType } = require("../../../models/transfer");
const { admLicenseTypeSchema } = require("../../validations/transfer/admLicenseTypeSchema");

module.exports = {
    addNewLicenseType: async (req, res) => {
        try {
            const { error } = admLicenseTypeSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            const newLicenseType = new LicenseType({ ...req.body });
            await newLicenseType.save();

            res.status(200).json(newLicenseType);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateNewLicenseType: async (req, res) => {
        try {
            const { id } = req.params;

            const { error } = admLicenseTypeSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid license type id");
            }
            const licenseType = await LicenseType.findByIdAndUpdate(
                id,
                { ...req.body },
                { runValidators: true, new: true }
            );
            if (!licenseType) {
                return sendErrorResponse(res, 400, "license type not found");
            }

            res.status(200).json(licenseType);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteLicenseType: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid license type id");
            }
            const licenseType = await LicenseType.findByIdAndDelete(id);
            if (!licenseType) {
                return sendErrorResponse(res, 400, "license type not found");
            }

            res.status(200).json({ message: "license type successfully deleted", _id: id });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllLicenseTypes: async (req, res) => {
        try {
            const licenseTypes = await LicenseType.find({}).sort({ createdAt: -1 }).lean();

            res.status(200).json(licenseTypes);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
