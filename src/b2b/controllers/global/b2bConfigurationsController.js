const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { Reseller, ResellerConfiguration } = require("../../models");
const { b2bConfigurationsSchema } = require("../../validations/global/b2bConfigurationsSchema");

module.exports = {
    updateSubAgentAccess: async (req, res) => {
        try {
            const {
                subAgentId,
                showAttraction,
                showInsurance,
                showHotel,
                showVisa,
                showA2a,
                showQuotaion,
                showFlight,
            } = req.body;

            const { error } = b2bConfigurationsSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(subAgentId)) {
                return sendErrorResponse(res, 400, "invalid sub agent id");
            }
            const subAgent = await Reseller.findOne({
                _id: subAgentId,
                referredBy: req.reseller._id,
            }).lean();
            if (!subAgent) {
                return sendErrorResponse(res, 404, "sub agent not found");
            }

            const configuration = await ResellerConfiguration.findOneAndUpdate(
                {
                    reseller: subAgentId,
                },
                {
                    showAttraction:
                        req.reseller?.configuration?.showAttraction === true
                            ? showAttraction
                            : false,
                    showHotel: req.reseller?.configuration?.showHotel === true ? showHotel : false,
                    showInsurance:
                        req.reseller?.configuration?.showInsurance === true ? showInsurance : false,
                    showFlight:
                        req.reseller?.configuration?.showFlight === true ? showFlight : false,
                    showVisa: req.reseller?.configuration?.showVisa === true ? showVisa : false,
                    showA2a: req.reseller?.configuration?.showA2a === true ? showA2a : false,
                    showQuotaion:
                        req.reseller?.configuration?.showQuotaion === true ? showQuotaion : false,
                },
                { upsert: true, runValidators: true, new: true }
            ).lean();

            res.status(200).json({
                message: "subagent configuration successfully updated",
                configuration,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSubAgentConfig: async (req, res) => {
        try {
            const { subAgentId } = req.params;

            if (!isValidObjectId(subAgentId)) {
                return sendErrorResponse(res, 400, "invalid subagent id");
            }
            const subAgent = await Reseller.findOne({
                _id: subAgentId,
                referredBy: req.reseller?._id,
            })
                .populate("configuration")
                .select("configuration companyName agentCode name")
                .lean();
            if (!subAgent) {
                return sendErrorResponse(res, 400, "invalid subagent id");
            }

            res.status(200).json(subAgent);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
