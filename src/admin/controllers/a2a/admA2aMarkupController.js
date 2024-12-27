const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { B2BA2aTicketMarkup, B2BA2aTicket } = require("../../../b2b/models");
const { b2bA2aMarkupSchema } = require("../../validations/b2bA2aMarkup.schema");

module.exports = {
    upsertB2bA2aMarkup: async (req, res) => {
        try {
            const { markupType, markup, a2aTicketId } = req.body;

            const { _, error } = b2bA2aMarkupSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(a2aTicketId)) {
                return sendErrorResponse(res, 400, "Invalid a2aTicket id");
            }

            const a2aTicket = await B2BA2aTicket.findOne({
                _id: a2aTicketId,
                isDeleted: false,
            });

            if (!a2aTicket) {
                return sendErrorResponse(res);
            }

            const a2aTicketMarkup = await B2BA2aTicketMarkup.findOneAndUpdate(
                {
                    a2aTicketId,
                },
                { a2aTicketId, markupType, markup },
                { upsert: true, new: true, runValidators: true }
            );

            res.status(200).json({
                _id: a2aTicket._id,
                message: "markup updated successfully",
            });
        } catch (err) {
            // sendErrorResponse(res, 500, err);
        }
    },
};
