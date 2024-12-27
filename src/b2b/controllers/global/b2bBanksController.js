const { sendErrorResponse } = require("../../../helpers");
const { B2BBankDetails } = require("../../models");

module.exports = {
    getAllB2bBanksList: async (req, res) => {
        try {
            const banks = await B2BBankDetails.find({ resellerId: req.reseller?._id }).lean();

            res.status(200).json(banks);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
