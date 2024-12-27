const { isValidObjectId, Types } = require("mongoose");
const { sendErrorResponse, sendMobileOtp } = require("../../../helpers");
const { b2bVisaEnquireySchema } = require("../../validations/b2bVisaEnquirey.schema");
const { VisaEnquiry } = require("../../../models");

module.exports = {
    addVisaEnquiry: async (req, res) => {
        try {
            const { name, email, whatsapp, nationality } = req.body;

            const { _, error } = b2bVisaEnquireySchema.validate(req.body);
            if (error) {
                return sendErrorResponse(
                    res,
                    400,
                    error.details ? error?.details[0]?.message : error.message
                );
            }

            const newVisaEnquirey = new VisaEnquiry({
                requestedBy: "b2b",
                reseller: req.reseller._id,
                name,
                email,
                whatsapp,
                nationality,
            });

            await newVisaEnquirey.save();

            res.status(200).json({ message: "Visa enquiry submitted successfully" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
