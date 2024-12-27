const { isValidObjectId } = require("mongoose");
const { sendErrorResponse } = require("../../../helpers");
const { InvoiceSettings, CompanyBankInfo } = require("../../../models/global");
const { invoiceSettingsSchema } = require("../../validations/invoice/invoiceSettings.schema");

module.exports = {
    updateInvoiceSettings: async (req, res) => {
        try {
            const { showBankDetails, showTermsAndConditions, bankAccounts, emails } = req.body;

            const parsedBankAccounts = bankAccounts ? JSON.parse(bankAccounts) : [];
            const parsedEmails = emails ? JSON.parse(emails) : [];
            const { error } = invoiceSettingsSchema.validate({
                ...req.body,
                bankAccounts: parsedBankAccounts,
                emails: parsedEmails,
            });
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            let logoImg;
            if (req.file?.path) {
                logoImg = "/" + req.file.path.replace(/\\/g, "/");
            }

            if (parsedBankAccounts?.length > 0) {
                for (let element of parsedBankAccounts) {
                    if (!isValidObjectId(element)) {
                        return sendErrorResponse(res, 400, "invalid bank account id");
                    }
                    const bankAccount = await CompanyBankInfo.findById(element).lean();
                    if (!bankAccount) {
                        return sendErrorResponse(res, 400, "invalid bank account id");
                    }
                }
            }

            const invoiceSettings = await InvoiceSettings.findOneAndUpdate(
                { settingsNumber: 1 },
                {
                    ...req.body,
                    companyLogo: logoImg || undefined,
                    showBankDetails: showBankDetails === "true",
                    showTermsAndConditions: showTermsAndConditions === "true",
                    bankAccounts: parsedBankAccounts,
                    emails: parsedEmails,
                },
                { upsert: true, new: true, runValidators: true }
            );

            res.status(200).json(invoiceSettings);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleInvoiceSettings: async (req, res) => {
        try {
            const invoiceSettings = await InvoiceSettings.findOne({ settingsNumber: 1 }).lean();
            if (!invoiceSettings) {
                return sendErrorResponse(res, 400, "invoice settings not found");
            }

            res.status(200).json(invoiceSettings);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
