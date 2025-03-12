const { sendErrorResponse } = require("../../../helpers");
const { B2CBankDetails } = require("../../models");

module.exports = {
    getAllB2cBanksList: async (req, res) => {
        try {
            const banks = await B2CBankDetails.find({ user: req.user?._id }).lean();

            res.status(200).json(banks);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
