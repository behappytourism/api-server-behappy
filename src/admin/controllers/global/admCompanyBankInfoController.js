const { isValidObjectId } = require("mongoose");

const { Country } = require("../../../models");
const { CompanyBankInfo } = require("../../../models/global");
const { companyBankInfoSchema } = require("../../validations/global/companyBankInfo.schema");
const { sendErrorResponse } = require("../../../helpers");

module.exports = {
    addNewCompanyBankAccount: async (req, res) => {
        try {
            const { countryCode, ifscCode, ibanCode } = req.body;

            const { error } = companyBankInfoSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error?.details[0]?.message);
            }

            if (!ifscCode && !ibanCode) {
                return sendErrorResponse(res, 400, "IFSC Code or IBAN Code must be specified");
            }

            const country = await Country.findOne({ isocode: countryCode?.toUpperCase() }).lean();
            if (!country) {
                return sendErrorResponse(res, 400, "country not found");
            }

            const newBankAccount = new CompanyBankInfo({
                ...req.body,
            });
            await newBankAccount.save();

            res.status(201).json(newBankAccount);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateCompanyBankAccountInfo: async (req, res) => {
        try {
            const { id } = req.params;
            const { countryCode, ifscCode, ibanCode } = req.body;

            const { error } = companyBankInfoSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error?.details[0]?.message);
            }

            if (!ifscCode && !ibanCode) {
                return sendErrorResponse(res, 400, "IFSC Code or IBAN Code must be specified");
            }

            const country = await Country.findOne({ isocode: countryCode?.toUpperCase() }).lean();
            if (!country) {
                return sendErrorResponse(res, 404, "country not found");
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid bank account info id");
            }
            const bankAccount = await CompanyBankInfo.findByIdAndUpdate(
                id,
                { ...req.body },
                { runValidators: true, new: true }
            );
            if (!bankAccount) {
                return sendErrorResponse(res, 404, "bankAccount info not found");
            }

            res.status(200).json(bankAccount);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteCompanyBankAccount: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid bank account info id");
            }
            const bankAccount = await CompanyBankInfo.findByIdAndDelete(id);
            if (!bankAccount) {
                return sendErrorResponse(res, 404, "bankAccount info not found");
            }

            res.status(200).json({ message: "bank account info successfully deleted", _id: id });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllCompanyBankAccounts: async (req, res) => {
        try {
            const bankAccounts = await CompanyBankInfo.find({}).sort({ createdAt: -1 }).lean();

            res.status(200).json(bankAccounts);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingelCompanyBankAccount: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid bank account info id");
            }
            const bankAccount = await CompanyBankInfo.findById(id);
            if (!bankAccount) {
                return sendErrorResponse(res, 404, "bankAccount info not found");
            }

            res.status(200).json(bankAccount);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllCompanyBankNames: async (req, res) => {
        try {
            const bankAccounts = await CompanyBankInfo.find({})
                .select("bankName")
                .sort({ createdAt: -1 })
                .lean();

            res.status(200).json(bankAccounts);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
