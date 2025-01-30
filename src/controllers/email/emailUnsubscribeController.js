const { isValidObjectId } = require("mongoose");
const { sendErrorResponse } = require("../../helpers");
const { EmailUnsubscriber, EmailCampaign } = require("../../models");

module.exports = {
    updateEmailUnsubscriber: async (req, res) => {
        try {
            const { check, direct } = req.body;

            if (!check || !direct) {
                return sendErrorResponse(res, 400, "email verifcation gone wrong");
            }

            const emailCampaign = await EmailCampaign.findOne({ hashedCampaignId: check });

            if (!emailCampaign) {
                return sendErrorResponse(res, 400, "email verifcation gone wrong");
            }

            console.log(emailCampaign, "email camp");
            let singleEmail = emailCampaign.emails.find((email) => email.hashedEmail == direct);

            if (!singleEmail) {
                return sendErrorResponse(res, 400, "email verifcation gone wrong");
            }

            console.log(singleEmail?.email, "email");

            const existingUnsubscriber = await EmailUnsubscriber.findOne({
                email: singleEmail?.email,
            });
            if (existingUnsubscriber) {
                return sendErrorResponse(res, 400, "email already unsubscribed");
            }

            const emailUnsubscriber = await EmailUnsubscriber.findOneAndUpdate(
                { email: singleEmail?.email },
                { email: singleEmail?.email },
                { new: true, runValidators: true, upsert: true }
            );

            if (!emailUnsubscriber) {
                return sendErrorResponse(res, 404, "email not found");
            }

            res.status(200).json({
                email: singleEmail?.email,
                unSubscride: true,
                message: "email has been unsubscribed successfully",
            });
        } catch (err) {
            console.log(err, "error");
            sendErrorResponse(res, 500, err);
        }
    },

    updateEmailSubscriber: async (req, res) => {
        try {
            const { check, direct } = req.body;

            if (!check || !direct) {
                return sendErrorResponse(res, 400, "email verifcation gone wrong");
            }

            const emailCampaign = await EmailCampaign.findOne({ hashedCampaignId: check });

            if (!emailCampaign) {
                return sendErrorResponse(res, 400, "email verifcation gone wrong");
            }

            let singleEmail = emailCampaign.emails.find((email) => email.hashedEmail == direct);

            if (!singleEmail) {
                return sendErrorResponse(res, 400, "email verifcation gone wrong");
            }

            const emailUnsubscriber = await EmailUnsubscriber.findOneAndDelete({
                email: singleEmail?.email,
            });

            if (!emailUnsubscriber) {
                return sendErrorResponse(res, 404, "email  not found in subscription list");
            }

            res.status(200).json({
                email: email,
                unSubscride: false,
                message: " Successfully subscrided . You will receive emails  and notifications",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
