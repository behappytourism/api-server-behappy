const { Types, isValidObjectId } = require("mongoose");

const { InsurancePlan } = require("../../../models");
const { sendErrorResponse } = require("../../../helpers");
const {
    createInsuranceQuotation,
    createContract,
    downloadContractPdf,
} = require("../../helpers/insurance/createInsuranceHelper");
const { insuranceQuotation } = require("../../validations/insurance/b2bInsurance.schema");
const { generateUniqueString } = require("../../../utils");
const {
    B2bInsurnaceContract,
    B2BTransaction,
    B2BWallet,
    B2BMarkupProfile,
} = require("../../models");
const InsurnacePlan = require("../../../models/insurance/insurancePlan.model");

module.exports = {
    getAllPlans: async (req, res) => {
        try {
            const insurancePlans = await InsurancePlan.find({
                isDeleted: false,
                type: "SG",
            }).select("name insuranceId");

            if (!insurancePlans) {
                return sendErrorResponse(res, 400, "No insurance found");
            }

            res.status(200).json(insurancePlans);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    createInsuranceQuotation: async (req, res) => {
        try {
            const { generalData, beneficiaryData } = req.body;

            const { _, error } = insuranceQuotation.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const createInsuranceQuotationResponse = await createInsuranceQuotation(
                generalData,
                beneficiaryData
            );

            let insurancePlan = await InsurancePlan.findById(generalData.plan);

            if (!insurancePlan) {
                return sendErrorResponse(res, 400, "No insurance plan found");
            }

            let selectedInsurance = createInsuranceQuotationResponse.find((insurance) => {
                return Number(insurance.id) === Number(insurancePlan.insuranceId);
            });

            if (!selectedInsurance) {
                return sendErrorResponse(
                    res,
                    400,
                    "No insurance found for this plan .Change plan and check "
                );
            }

            let selectedProfile = await B2BMarkupProfile.findOne({
                resellerId: req?.reseller?._id,
            });

            let insuranceMarkup = selectedProfile?.insurance?.find((insurance) => {
                return insurance?.insuranceId === insurancePlan?.insuranceId;
            });

            let totalAmount = 0;
            let priceDetails = beneficiaryData.map((benfData, index) => {
                let priceWithDiscount = selectedInsurance.price[index][0]?.Price0;
                if (insuranceMarkup) {
                    if (insuranceMarkup?.markupType === "percentage") {
                        const markupAmount = insuranceMarkup.markup / 100;
                        priceWithDiscount = priceWithDiscount * (1 - markupAmount);
                    } else if (insuranceMarkup.markupType === "flat") {
                        priceWithDiscount -= insuranceMarkup.markup;
                    }
                }

                totalAmount += priceWithDiscount;
                return {
                    ...benfData,
                    consecutiveDays: selectedInsurance.price[index][0]?.ConsecutiveDays,
                    discountType: insuranceMarkup?.markupType || "percentage",
                    discount: insuranceMarkup?.markup || 0,
                    price: selectedInsurance.price[index][0]?.Price0,
                    priceWithDiscount,
                };
            });

            res.status(200).json({ totalAmount, details: priceDetails });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    initateContract: async (req, res) => {
        try {
            let { generalData, beneficiaryData } = req.body;

            const { _, error } = insuranceQuotation.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const createInsuranceQuotationResponse = await createInsuranceQuotation(
                generalData,
                beneficiaryData
            );

            let insurancePlan = await InsurancePlan.findById(generalData.plan);
            if (!insurancePlan) {
                return sendErrorResponse(res, 400, "No insurance plan found");
            }

            let selectedInsurance = createInsuranceQuotationResponse.find((insurance) => {
                return Number(insurance.id) === Number(insurancePlan.insuranceId);
            });

            if (!selectedInsurance) {
                return sendErrorResponse(res, 400, "No insurance found");
            }

            let selectedProfile = await B2BMarkupProfile.findOne({
                resellerId: req?.reseller?._id,
            });

            let insuranceMarkup = selectedProfile?.insurance?.find((insurance) => {
                return insurance?.insuranceId === insurancePlan?.insuranceId;
            });

            let totalPrice = 0;
            let markup = 0;

            beneficiaryData = beneficiaryData.map((benfData, index) => {
                totalPrice += Number(selectedInsurance.price[index][0]?.Price0);
                let priceWithDiscount = selectedInsurance.price[index][0]?.Price0;
                if (insuranceMarkup) {
                    if (insuranceMarkup?.markupType === "percentage") {
                        const markupAmount = insuranceMarkup.markup / 100;
                        markup += priceWithDiscount - priceWithDiscount * (1 - markupAmount);
                    } else if (insuranceMarkup.markupType === "flat") {
                        markup += priceWithDiscount - insuranceMarkup.markup;
                    }
                }
                return {
                    ...benfData,
                    consecutiveDays: selectedInsurance.price[index][0]?.ConsecutiveDays,
                    price: selectedInsurance.price[index][0]?.Price0,
                    priceId: selectedInsurance.price[index][0]?.id,
                };
            });
            const newContractOrder = new B2bInsurnaceContract({
                plan: generalData.plan,
                planName: insurancePlan.name,
                residence: generalData.residence,
                destination: generalData.destination,
                travelFrom: generalData.travelFrom,
                travelTo: generalData.travelTo,
                travelType: generalData.travelType,
                beneficiaryData,
                status: "pending",
                referenceNumber: generateUniqueString("B2BINS"),
                markup,
                totalAmountWithoutDiscount: Number(totalPrice),
                totalAmount: Number(totalPrice) - Number(markup),
                reseller: req.reseller._id,
                otp: 12345,
            });

            await newContractOrder.save();

            res.status(200).json({ orderId: newContractOrder._id, message: "order initaited" });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    createContract: async (req, res) => {
        try {
            const { otp, orderId } = req.body;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            if (!otp) {
                return sendErrorResponse(res, 400, "otp not found ");
            }

            let insuranceContract = await B2bInsurnaceContract.findOne({ _id: orderId });

            if (!insuranceContract) {
                return sendErrorResponse(res, 400, "No insurance contract found");
            }

            let insurancePlan = await InsurnacePlan.findOne({ _id: insuranceContract.plan });

            if (!insurancePlan) {
                return sendErrorResponse(res, 400, "No insurance plan found");
            }

            if (!Number(insuranceContract.otp) || Number(insuranceContract.otp) !== Number(otp)) {
                return sendErrorResponse(res, 400, "incorrect otp!");
            }

            let amount = insuranceContract.totalAmount;

            let wallet = await B2BWallet.findOne({
                reseller: req.reseller?._id,
            });

            let reseller = req.reseller;
            if (!wallet || wallet.balance < amount) {
                sendInsufficentBalanceMail(reseller);
            }

            if (
                !wallet ||
                Number(wallet?.balance) +
                    (Number(wallet?.creditAmount) - Number(wallet?.creditUsed)) <
                    Number(amount)
            ) {
                // let reseller = req.reseller;
                // sendInsufficentBalanceMail(reseller);
                return sendErrorResponse(
                    res,
                    400,
                    "Insufficient balance. please reacharge and try again"
                );
            }

            const { contractId } = await createContract(insuranceContract, insurancePlan);

            if (wallet.balance < amount) {
                wallet.creditUsed += Number(amount) - Number(wallet.balance);
                wallet.balance = 0;
                await wallet.save();
            } else {
                wallet.balance -= amount;
                await wallet.save();
            }

            await B2BTransaction.create({
                reseller: req.reseller?._id,
                paymentProcessor: "wallet",
                product: "insurance",
                processId: orderId,
                description: "Insurance payment",
                debitAmount: amount,
                creditAmount: 0,
                directAmount: 0,
                closingBalance: wallet.balance,
                dueAmount: wallet.creditUsed,
                remark: "Insurance payment",
                dateTime: new Date(),
            });

            insuranceContract.status = "completed";
            insuranceContract.contractId = contractId;

            await insuranceContract.save();

            res.status(200).json({ contractId: contractId, message: "order created successfully" });
        } catch (err) {
            console.log(err);

            sendErrorResponse(res, 500, err);
        }
    },

    downloadContract: async (req, res) => {
        try {
            const { orderId } = req.params;

            const insuranceContract = await B2bInsurnaceContract.findOne({ _id: orderId });

            if (!insuranceContract) {
                return sendErrorResponse(res, 400, "No insurance plan found");
            }

            const pdfBuffer = await downloadContractPdf({
                contractId: insuranceContract.contractId,
                res,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllInsuranceContracts: async (req, res) => {
        try {
            const insuranceContracts = await B2bInsurnaceContract.find({
                reseller: req.reseller?._id,
            })
                .sort({ createdAt: -1 })
                // .limit(limit)
                // .skip(limit * skip)
                .lean();

            res.status(200).json(insuranceContracts);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleInsuranceContractDetails: async (req, res) => {
        try {
            const { contractId } = req.params;

            if (!isValidObjectId(contractId)) {
                return sendErrorResponse(res, 400, "invalid contract id");
            }
            const singleInsuranceContract = await B2bInsurnaceContract.findOne({
                _id: contractId,
                reseller: req.reseller?._id,
            }).lean();
            if (!singleInsuranceContract) {
                return sendErrorResponse(res, 404, "insurance contract not found");
            }

            res.status(200).json(singleInsuranceContract);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
