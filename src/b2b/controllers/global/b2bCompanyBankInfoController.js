const { sendErrorResponse } = require("../../../helpers");
const { CompanyBankInfo } = require("../../../models/global");

module.exports = {
    getAllCompanyBankAccounts: async (req, res) => {
        try {
            const bankAccounts = await CompanyBankInfo.find({}).lean();

            res.status(200).json(bankAccounts);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
