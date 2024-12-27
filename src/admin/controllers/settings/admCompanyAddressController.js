const { isValidObjectId } = require("mongoose");

const { CompanyAddress, Country } = require("../../../models");
const { admCompanyAddressSchema } = require("../../validations/settings/admCompanyAddress.schema");
const { State } = require("../../../models/global");
const { sendErrorResponse } = require("../../../helpers");

module.exports = {
    addNewCompanyAddress: async (req, res) => {
        try {
            const { country, state } = req.body;

            const { error } = admCompanyAddressSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            if (!isValidObjectId(country)) {
                return sendErrorResponse(res, 400, "invalid country id");
            }
            const countryDetail = await Country.findOne({
                _id: country,
                isDeleted: false,
            });
            if (!countryDetail) {
                return sendErrorResponse(res, 400, "country not found");
            }

            if (!isValidObjectId(state)) {
                return sendErrorResponse(res, 400, "invalid state id");
            }
            const stateDetail = await State.findOne({
                _id: state,
                country,
                isDeleted: false,
            });
            if (!stateDetail) {
                return sendErrorResponse(res, 400, "state not found");
            }

            const newCompanyAddress = new CompanyAddress({
                ...req.body,
            });
            await newCompanyAddress.save();

            res.status(200).json(newCompanyAddress);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateCompanyAddress: async (req, res) => {
        try {
            const { id } = req.params;
            const { country, state } = req.body;

            const { error } = admCompanyAddressSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid address id");
            }

            if (!isValidObjectId(country)) {
                return sendErrorResponse(res, 400, "invalid country id");
            }
            const countryDetail = await Country.findOne({
                _id: country,
                isDeleted: false,
            });
            if (!countryDetail) {
                return sendErrorResponse(res, 400, "country not found");
            }

            if (!isValidObjectId(state)) {
                return sendErrorResponse(res, 400, "invalid state id");
            }
            const stateDetail = await State.findOne({
                _id: state,
                country,
                isDeleted: false,
            });
            if (!stateDetail) {
                return sendErrorResponse(res, 400, "state not found");
            }

            const companyAddress = await CompanyAddress.findByIdAndUpdate(
                id,
                { ...req.body },
                { runValidators: true, new: true }
            );
            if (!companyAddress) {
                return sendErrorResponse(res, 400, "company address not found");
            }

            res.status(200).json(companyAddress);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteCompanyAddress: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid company address id");
            }
            const companyAddress = await CompanyAddress.findByIdAndDelete(id);
            if (!companyAddress) {
                return sendErrorResponse(res, 400, "company address not found");
            }

            res.status(200).json({ message: "company address successfully deleted", _id: id });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllCompanyAddresses: async (req, res) => {
        try {
            const companyAddresses = await CompanyAddress.find({})
                .populate("country", "countryName")
                .populate("state", "stateName")
                .sort({ createdAt: -1 })
                .lean();

            res.status(200).json({ companyAddresses });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleCompanyAddress: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid company address id");
            }
            const companyAddress = await CompanyAddress.findById(id);
            if (!companyAddress) {
                return sendErrorResponse(res, 400, "company address not found");
            }

            res.status(200).json(companyAddress);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
