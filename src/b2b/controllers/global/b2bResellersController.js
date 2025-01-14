const { hash } = require("bcryptjs");
const crypto = require("crypto");
const { isValidObjectId } = require("mongoose");
const { sendMessageHelper } = require("../../../config/whatsappConfig");

const { sendErrorResponse } = require("../../../helpers");
const { sendSubAgentRegistrationEmail } = require("../../helpers");
const sendForgetPasswordOtp = require("../../helpers/sendForgetPasswordMail");
const { Reseller, B2BTransaction, B2BWallet, ResellerConfiguration } = require("../../models");
const {
    subAgentRegisterSchema,
    resellerForgetPasswordSchema,
} = require("../../validations/b2bReseller.schema");

module.exports = {
    registerSubAgent: async (req, res) => {
        try {
            const {
                email,
                companyName,
                address,
                telephoneNumber,
                companyRegistration,
                trnNumber,
                website,
                country,
                city,
                zipCode,
                designation,
                name,
                phoneNumber,
                skypeId,
                whatsappNumber,
            } = req.body;

            const { _, error } = subAgentRegisterSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(
                    res,
                    400,
                    error.details ? error?.details[0]?.message : error.message
                );
            }

            const prevReseller = await Reseller.findOne({ email });
            if (prevReseller) {
                return sendErrorResponse(res, 400, "Email already exists");
            }

            const password = crypto.randomBytes(6).toString("hex");
            const hashedPassowrd = await hash(password, 8);

            const newSubAgent = new Reseller({
                email,
                companyName,
                address,
                website,
                country,
                city,
                zipCode,
                designation,
                name,
                phoneNumber,
                skypeId,
                whatsappNumber,
                telephoneNumber,
                referredBy: req.reseller._id,
                trnNumber,
                companyRegistration,
                role: "sub-agent",
                password: hashedPassowrd,
                status: "ok",
            });
            await newSubAgent.save();

            await ResellerConfiguration.create({
                showAttraction: req.reseller?.conifiguration?.showAttraction || false,
                showInsurance: req.reseller?.conifiguration?.showInsurance || false,
                showHotel: req.reseller?.conifiguration?.showHotel || false,
                showFlight: req.reseller?.conifiguration?.showFlight || false,
                showVisa: req.reseller?.conifiguration?.showVisa || false,
                showA2a: req.reseller?.conifiguration?.showA2a || false,
                showQuotaion: req.reseller?.conifiguration?.showQuotaion || false,
                reseller: newSubAgent?._id,
                allowedPaymentMethods: req.reseller?.conifiguration?.allowedPaymentMethods || [],
            });

            let agentCode = newSubAgent.agentCode;
            sendSubAgentRegistrationEmail({
                agentCode,
                email,
                password,
                companyName,
            });

            res.status(200).json({
                message: "Sub-agent created successfully.",
                data: { agentCode },
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    listResellers: async (req, res) => {
        try {
            const { search } = req.query;

            const filter = {
                referredBy: req.reseller._id,
                status: "ok",
            };

            if (search && search !== "") {
                filter.$or = [
                    { name: { $regex: search, $options: "i" } },
                    { companyName: { $regex: search, $options: "i" } },
                    { agentCode: { $regex: search, $options: "i" } },
                ];
            }

            const resellerList = await Reseller.find(filter).select("-jwtToken -password");

            if (!resellerList) {
                sendErrorResponse(res, 500, "No Resellers Found");
            }

            res.status(200).json(resellerList);
        } catch (err) {
            console.log(err, "error");
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleSubAgent: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid reseller id");
            }

            const reseller = await Reseller.findById(id)
                .populate("country", "countryName flag phonecode")
                .select("-jwtToken -password")
                .lean();

            if (!reseller) {
                return sendErrorResponse(res, 400, "subAgent not Found ");
            }

            const wallet = await B2BWallet.findOne({ reseller: reseller?._id });

            let totalEarnings = [];
            let pendingEarnings = [];
            let withdrawTotal = [];

            if (wallet) {
                totalEarnings = await B2BTransaction.aggregate([
                    {
                        $match: {
                            reseller: reseller?._id,
                            status: "success",
                            transactionType: "markup",
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: "$amount" },
                        },
                    },
                ]);

                pendingEarnings = await B2BTransaction.aggregate([
                    {
                        $match: {
                            reseller: reseller?._id,
                            status: "pending",
                            transactionType: "markup",
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: "$amount" },
                        },
                    },
                ]);

                withdrawTotal = await B2BTransaction.aggregate([
                    {
                        $match: {
                            reseller: reseller?._id,
                            status: "success",
                            transactionType: "withdraw",
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            total: { $sum: "$amount" },
                        },
                    },
                ]);
            }
            res.status(200).json({
                subAgent: reseller,
                balance: wallet ? wallet.balance : 0,
                totalEarnings: totalEarnings[0]?.total || 0,
                pendingEarnings: pendingEarnings[0]?.total || 0,
                withdrawTotal: withdrawTotal[0]?.total || 0,
            });

            // res.status(200).json({ subAgent });
        } catch (err) {
            console.log(err, "error");
            sendErrorResponse(res, 500, err);
        }
    },

    forgetPassword: async (req, res) => {
        try {
            const { email } = req.body;

            const reseller = await Reseller.findOne({ email: email }).populate("country");

            if (!reseller) {
                return sendErrorResponse(res, 404, "Account not found");
            }

            const otp = Math.floor(10000 + Math.random() * 90000);

            await sendForgetPasswordOtp(reseller.email, otp);

            reseller.otp = otp;
            if (reseller?.whatsappNumber) {
                sendMessageHelper({
                    type: "message",
                    number: `${reseller.country?.phonecode}${reseller?.whatsappNumber}`,
                    message: `forgot password otp is ${otp}`,
                });
            }

            await reseller.save();

            res.status(200).json({
                agentCode: reseller?.agentCode,
                message: "otp sended to mail id",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    confirmOtpForgetPassword: async (req, res) => {
        try {
            const { email, otp, newPassword, confirmPassword } = req.body;

            const { _, error } = resellerForgetPasswordSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(
                    res,
                    400,
                    error.details ? error?.details[0]?.message : error.message
                );
            }

            const reseller = await Reseller.findOne({ email });

            console.log(reseller, "reseller forgot password");

            if (!reseller) {
                return sendErrorResponse(res, 404, "Account not found");
            }

            if (Number(reseller.otp) != Number(otp)) {
                return sendErrorResponse(res, 404, "OTP Is Wrong");
            }

            const hashedPassowrd = await hash(newPassword, 8);

            reseller.password = hashedPassowrd;

            await reseller.save();

            res.status(200).json({
                agentCode: reseller?.agentCode,
                message: "Password Updated Sucessfully",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteSubAgent: async (req, res) => {
        try {
            const { subAgentId } = req.params;

            if (!isValidObjectId(subAgentId)) {
                return sendErrorResponse(res, 400, "invalid reseller id");
            }

            const subAgent = await Reseller.findById(subAgentId);

            if (!subAgent) {
                return sendErrorResponse(res, 400, "subAgent not found");
            }

            if (subAgent.referredBy == req.reseller._id) {
                return sendErrorResponse(res, 400, "subAgent not Found ");
            }

            subAgent.status = "disabled";

            await subAgent.save();

            res.status(200).json({
                message: "SubAgent Has Been Disabled Successfully",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateSubAgent: async (req, res) => {
        try {
            const { subAgentId } = req.params;

            const {
                email,
                companyName,
                address,
                telephoneNumber,
                companyRegistration,
                trnNumber,
                website,
                country,
                city,
                zipCode,
                designation,
                name,
                phoneNumber,
                skypeId,
                whatsappNumber,
            } = req.body;

            const { _, error } = subAgentRegisterSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(
                    res,
                    400,
                    error.details ? error?.details[0]?.message : error.message
                );
            }

            if (!isValidObjectId(subAgentId)) {
                return sendErrorResponse(res, 400, "invalid subAgent id");
            }

            const subAgent = await Reseller.findById(subAgentId);

            if (!subAgent) {
                return sendErrorResponse(res, 400, "SubAgent Not Found");
            }

            if (subAgent.referredBy.toString() !== req.reseller._id.toString()) {
                return sendErrorResponse(res, 400, "SubAgent Not Register Under Your Account");
            }

            const subAgentDetails = await Reseller.updateOne(
                { _id: subAgentId },
                {
                    $set: {
                        email,
                        companyName,
                        address,
                        telephoneNumber,
                        companyRegistration,
                        trnNumber,
                        website,
                        country,
                        city,
                        zipCode,
                        designation,
                        name,
                        phoneNumber,
                        skypeId,
                        whatsappNumber,
                    },
                }
            );

            res.json({
                message: "SubAgent Profile Has Been Edited Successfully",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
