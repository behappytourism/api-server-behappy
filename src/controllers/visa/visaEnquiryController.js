const { VisaEnquiry } = require("../../models");
const { isValidObjectId, Types } = require("mongoose");
const { visaEnquireySchema } = require("../../validations/visaEnquiry.schema");
const { sendErrorResponse } = require("../../helpers");
const { visaEnquireyWhatsappHelper } = require("../../helpers/visa/visaWhatsappHelper");
// const {visaEnquireyWhatsappHelper} = require("../../../");
module.exports = {
    addVisaEnquiry: async (req, res) => {
        try {
            const { name, email, whatsapp, nationality, message } = req.body;

            const { _, error } = visaEnquireySchema.validate(req.body);
            if (error) {
                return sendErrorResponse(
                    res,
                    400,
                    error.details ? error?.details[0]?.message : error.message
                );
            }

            const newVisaEnquirey = new VisaEnquiry({
                requestedBy: "b2c",
                user: req?.user ? req?.user?._id : null,
                name,
                email,
                whatsapp,
                nationality,
                message,
            });

            await newVisaEnquirey.save();
            visaEnquireyWhatsappHelper({ newVisaEnquirey });
            res.status(200).json({ message: "Visa enquiry submitted successfully" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
