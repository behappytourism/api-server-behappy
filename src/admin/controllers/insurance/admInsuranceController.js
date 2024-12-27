const { fetchInsurancePlans } = require("../../helpers/insurance/insuranceHelper");
const { sendErrorResponse } = require("../../../helpers");
const { InsurancePlan } = require("../../../models");
const { B2bInsurnaceContract } = require("../../../b2b/models");
const { isValidObjectId } = require("mongoose");

module.exports = {
    getAllInsurancePlans: async (req, res) => {
        try {
            const { skip, limit, category } = req.query;

            const insurancePlansResponse = await fetchInsurancePlans(category);
            console.log(JSON.stringify(insurancePlansResponse), "plans");
            for (let i = 0; i < insurancePlansResponse.plans.length; i++) {
                let singlePlan = insurancePlansResponse.plans[i];

                const singleObject = singlePlan.price[0][0];

                const insurancePlans = await InsurancePlan.findOneAndUpdate(
                    { insuranceId: singlePlan.id, type: singlePlan.type },
                    {
                        $set: {
                            insuranceId: singlePlan.id,
                            name: singlePlan.name,
                            printName: singlePlan.print_name,
                            currency: singlePlan.currency_code,
                            formulaId: singlePlan.formula_id,
                            type: singlePlan.type,
                            priceId: Number(singleObject.id),
                            ruleVersion: Number(singleObject.rule_version),
                            category: singleObject.Category,
                            code: singleObject.Code,
                            price: Number(singleObject.Price),
                            consecutiveDays: singleObject.ConsecutiveDays,
                            SIA: singleObject.SIA,
                            COM: singleObject.COM,
                        },
                    },
                    { upsert: true, new: true }
                );
            }

            const plans = await InsurancePlan.find({ isDeleted: false, type: "SG" })
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalPlans = await InsurancePlan.find({
                isDeleted: false,
                type: "SG",
            }).count();

            res.status(200).json({ plans, totalPlans, skip: Number(skip), limit: Number(limit) });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    getAllB2bInsuranceContracts: async (req, res) => {
        try {
            const { skip = 0, limit = 10 } = req.query;

            const insuranceContracts = await B2bInsurnaceContract.find({})
                .populate("reseller", "companyName agentCode")
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalInsuranceContracts = await B2bInsurnaceContract.count();

            res.status(200).json({
                totalInsuranceContracts,
                skip: Number(skip),
                limit: Number(limit),
                insuranceContracts,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleB2bInsuranceContractDetails: async (req, res) => {
        try {
            const { contractId } = req.params;

            if (!isValidObjectId(contractId)) {
                return sendErrorResponse(res, 400, "invalid contract id");
            }
            const singleInsuranceContract = await B2bInsurnaceContract.findById(contractId)
                .populate("reseller", "companyName agentCode")
                .lean();
            if (!singleInsuranceContract) {
                return sendErrorResponse(res, 404, "insurance contract not found");
            }

            res.status(200).json(singleInsuranceContract);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
