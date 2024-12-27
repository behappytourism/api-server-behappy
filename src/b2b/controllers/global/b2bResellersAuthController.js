const { hash, compare } = require("bcryptjs");
const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { Country, AdminB2bAccess } = require("../../../models");
const generateRandomString = require("../../../utils/generateRandomString");
const b2bAccountDeleteEmail = require("../../helpers/b2bDeleteAccountEmail");
const sendSignUpEmail = require("../../helpers/sendSignUpEmail");
const { Reseller, ResellerConfiguration } = require("../../models");
const {
    resellerRegisterSchema,
    resellerLoginSchema,
    resellerProfileUpdateSchema,
    resellerCompanyUpdateSchema,
    resellerPasswordUpdateSchema,
} = require("../../validations/b2bReseller.schema");

module.exports = {
    resellerRegister: async (req, res) => {
        try {
            const {
                email,
                companyName,
                address,
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
                password,
            } = req.body;

            const { _, error } = resellerRegisterSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(
                    res,
                    400,
                    error.details ? error?.details[0]?.message : error.message
                );
            }

            const resellerReg = await Reseller.findOne({ email });

            if (resellerReg) {
                return sendErrorResponse(res, 400, "Email already exists");
            }

            const hashedPassowrd = await hash(password, 8);

            const newReseller = new Reseller({
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
                trnNumber,
                companyRegistration,
                role: "reseller",
                password: hashedPassowrd,
                status: "pending",
            });

            await newReseller.save(async (error, reseller) => {
                if (error) {
                    return res.status(400).json({
                        message: error.message,
                    });
                }

                await ResellerConfiguration.create({
                    reseller: newReseller?._id,
                    allowedPaymentMethods: ["wallet", "ccavenue", "pay-later"],
                });

                let agentCode = reseller.agentCode;
                let companyName = reseller.companyName;
                sendSignUpEmail(email, agentCode, companyName);

                return res.status(200).json({
                    message: "Reseller created successfully.",
                    data: {
                        agentCode: reseller.agentCode,
                    },
                });
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    resellerLogin: async (req, res) => {
        try {
            const { agentCode, email, password } = req.body;

            const { _, error } = resellerLoginSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(
                    res,
                    400,
                    error.details ? error?.details[0]?.message : error.message
                );
            }

            const reseller = await Reseller.findOne({ email }).populate("country");
            if (!reseller) {
                return sendErrorResponse(res, 400, "Invalid credentials");
            }

            if (process.env.LOGIN_AGENTCODE_REQUIRED === "true") {
                if (reseller.agentCode !== Number(agentCode)) {
                    return sendErrorResponse(res, 400, "Invalid credentials ");
                }
            }

            const isMatch = await compare(password, reseller.password);
            if (!isMatch) {
                return sendErrorResponse(res, 400, "Invalid Password credentials");
            }

            if (reseller.status === "pending") {
                let randomStr = generateRandomString(10);

                reseller.randomString = randomStr;
                await reseller.save();

                return res.status(200).json({
                    status: reseller.status,
                    message: "status is pending . please wait for approval and upload documents",
                    agentCode: reseller.agentCode,
                    randomString: randomStr,
                });
            }

            if (reseller.status !== "ok") {
                return sendErrorResponse(
                    res,
                    400,
                    "Your account is currently disabled or under verification. Please contact support team if you have any queries"
                );
            }

            const jwtToken = await reseller.generateAuthToken();
            await reseller.save();

            const configuration = await ResellerConfiguration.findOne({
                reseller: reseller?._id,
            }).lean();

            const tempObj = JSON.parse(JSON.stringify(reseller));
            tempObj.configuration = configuration;

            res.status(200).json({
                status: reseller.status,
                reseller: tempObj,
                jwtToken,
                agentCode: reseller.agentCode,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateProfileSetting: async (req, res) => {
        try {
            const {
                name,
                skypeId,
                whatsappNumber,
                designation,
                phoneNumber,
                telephoneNumber,
                country,
            } = req.body;

            const { _, error } = resellerProfileUpdateSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            let avatarImg;
            if (req.file?.path) {
                avatarImg = "/" + req.file.path.replace(/\\/g, "/");
            }

            if (country) {
                if (!isValidObjectId(country)) {
                    return sendErrorResponse(res, 400, "Invalid country id");
                }

                const countryDetails = await Country.findById(country);
                if (!countryDetails) {
                    return sendErrorResponse(res, 404, "Country not found");
                }
            }

            const reseller = await Reseller.findOneAndUpdate(
                { _id: req.reseller._id },
                {
                    name,
                    phoneNumber,
                    skypeId,
                    whatsappNumber,
                    telephoneNumber,
                    designation,
                    avatarImg,
                    country,
                },
                { runValidators: true, new: true }
            );
            if (!reseller) {
                return sendErrorResponse(res, 404, "User not found");
            }

            const resellerDetails = await Reseller.findOne({ _id: req.reseller._id })
                .populate("configuration")
                .populate("country")
                .lean();

            res.status(200).json(resellerDetails);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateCompanySettings: async (req, res) => {
        try {
            const { companyName, address, companyRegistration, trnNumber, website, city, zipCode } =
                req.body;

            const { _, error } = resellerCompanyUpdateSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            let companyLogo;
            if (req.file?.path) {
                companyLogo = "/" + req.file.path.replace(/\\/g, "/");
            }

            const reseller = await Reseller.findOneAndUpdate(
                { _id: req.reseller._id },

                {
                    companyName,
                    address,
                    companyRegistration,
                    trnNumber,
                    website,
                    city,
                    zipCode,
                    companyLogo: companyLogo || undefined,
                },
                { runValidators: true, new: true }
            );

            if (!reseller) {
                return sendErrorResponse(res, 404, "Reseller not found");
            }

            const resellerDetails = await Reseller.findOne({ _id: req.reseller._id })
                .populate("configuration")
                .lean();

            res.status(200).json(resellerDetails);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updatePassword: async (req, res) => {
        try {
            const { oldPassword, confirmPassword, newPassword } = req.body;

            const { _, error } = resellerPasswordUpdateSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(
                    res,
                    400,
                    error.details ? error?.details[0]?.message : error.message
                );
            }

            const isMatch = await compare(oldPassword, req.reseller.password);
            if (!isMatch) {
                return sendErrorResponse(res, 400, "Old password is incorrect");
            }

            const hashedPassowrd = await hash(newPassword, 8);
            const reseller = await Reseller.findOneAndUpdate(
                { _id: req.reseller._id },
                { password: hashedPassowrd }
            );

            if (!reseller) {
                return sendErrorResponse(res, 404, "User not found");
            }

            res.status(200).json({ message: "Password updated successfully" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getReseller: async (req, res) => {
        try {
            const adminAccess = await AdminB2bAccess.findOne({
                reseller: req.reseller._id,
            })
                .populate("quotations")
                .populate("a2as")
                .populate("hotels")
                .populate("visas")
                .populate("attractions")
                .select("-_id quotations a2as hotels visas attractions");
            const whatsappDetails = {};
            for (const key in adminAccess) {
                if (Array.isArray(adminAccess[key]) && adminAccess[key].length > 0) {
                    const firstElement = adminAccess[key].find((element) => {
                        return element.phoneNumber;
                    });

                    whatsappDetails[key] = {
                        name: firstElement.name,
                        phoneNumber: firstElement.phoneNumber,
                    };
                }
            }

            req.reseller.whatsappDetails = whatsappDetails;

            res.status(200).json(req.reseller);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteAccount: async (req, res) => {
        try {
            const reseller = await Reseller.findOneAndUpdate(
                { _id: req.reseller._id },
                {
                    $set: {
                        status: "disabled",
                    },
                }
            );

            if (!reseller) {
                return sendErrorResponse(res, 400, "Reseller not found");
            }

            b2bAccountDeleteEmail(reseller);

            res.status(200).json({ message: "Account deleted successfully" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateCertifcations: async (req, res) => {
        try {
            const { agentCode } = req.params;

            const reseller = await Reseller.findOne({ agentCode: agentCode, status: "pending" });

            if (!reseller) {
                return sendErrorResponse(res, 404, "Reseller not found");
            }

            let tradeLicense;
            if (req.files["tradeLicense"]?.length > 0) {
                let tradeLicenses = req.files["tradeLicense"];
                tradeLicense = "/" + tradeLicenses[0]?.path?.replace(/\\/g, "/");
            } else {
                return sendErrorResponse(
                    res,
                    404,
                    "Trade License / Incorporation Certificate is missing"
                );
            }

            let taxCertificate;
            if (req.files["taxCertificate"]?.length > 0) {
                let taxCertificates = req.files["taxCertificate"];
                taxCertificate = "/" + taxCertificates[0]?.path?.replace(/\\/g, "/");
            } else {
                return sendErrorResponse(res, 404, "VAT / TAX Certificate is missing");
            }

            const resellerUpdate = await Reseller.findOneAndUpdate(
                { agentCode: agentCode },

                {
                    taxCertificate,
                    tradeLicense,
                },
                { runValidators: true, new: true }
            );

            res.status(200).json({ reseller: resellerUpdate, message: "updated successfully" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getCertificateDetails: async (req, res) => {
        try {
            const { agentCode, randomString } = req.params;

            const reseller = await Reseller.findOne({ agentCode: agentCode, randomString });

            if (!reseller) {
                return sendErrorResponse(res, 404, "Reseller not found");
            }

            res.status(200).json({
                agentCode: reseller.agentCode,
                taxCertificate: reseller?.taxCertificate,
                tradeLicense: reseller?.tradeLicense,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
