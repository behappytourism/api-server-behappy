const { isValidObjectId } = require("mongoose");
const { hash } = require("bcryptjs");
const crypto = require("crypto");
const xl = require("excel4node");

const { sendErrorResponse } = require("../../../helpers");
const { Reseller, B2BMarkupProfile, ResellerConfiguration } = require("../../../b2b/models");
const {
    resellerUpdateSchema,
    resellerAddSchema,
    subAgentAddSchema,
    resellerStatusUpdateSchema,
} = require("../../validations/admResllers.schema");
const { B2BWallet, B2BTransaction } = require("../../../b2b/models");
const MarkupProfile = require("../../models/markupProfile.model");
const { Country } = require("../../../models");
const {
    sendResellerCredentials,
    sendResellerUpdatedCredentials,
    sendResellerApprovalEmail,
    b2bAccountCancellationEmail,
    b2bAccountDisabledEmail,
    b2bAccountEnbaledEmail,
} = require("../../helpers/reseller");
const {
    admResellerConfigurationSchema,
} = require("../../validations/reseller/admResellerConfiguration.schema");

module.exports = {
    getAllResellers: async (req, res) => {
        try {
            const { skip = 0, limit = 10, status, searchQuery, role, country } = req.query;

            const filters = {};
            if (role && role !== "") {
                filters.role = role;
            }

            if (status && status !== "") {
                filters.status = status;
            }

            if (searchQuery && searchQuery !== "") {
                filters.$or = [
                    {
                        companyName: {
                            $regex: searchQuery,
                            $options: "i",
                        },
                    },
                    {
                        email: {
                            $regex: searchQuery,
                            $options: "i",
                        },
                    },
                    {
                        agentCode: !isNaN(searchQuery) ? Number(searchQuery) : "",
                    },
                ];
            }

            if (country) {
                filters.country = country;
            }

            const resellers = await Reseller.find(filters)
                .populate("country", "countryName logo phonecode")
                .populate("referredBy", "companyName agentCode")
                .select(
                    "agentCode country companyName email avatar name website phoneNumber status"
                )
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalResellers = await Reseller.find(filters).count();

            res.status(200).json({
                resellers,
                skip: Number(skip),
                limit: Number(limit),
                totalResellers,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    changeResellerStatus: async (req, res) => {
        try {
            const { resellerId } = req.params;
            const { status, formData } = req.body;

            const { _, error } = resellerStatusUpdateSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(
                    res,
                    400,
                    error.details ? error?.details[0]?.message : error.message
                );
            }

            if (!isValidObjectId(resellerId)) {
                return sendErrorResponse(res, 400, "Invalid reseller id");
            }
            const reseller = await Reseller.findById(resellerId).lean();
            if (!reseller) {
                return sendErrorResponse(res, 404, "Reseller not found");
            }

            if (status === "ok" && formData) {
                const { profileId } = formData;

                const profile = await MarkupProfile.findOne({ _id: profileId }).select({
                    "activities._id": 0,
                    "visa._id": 0,
                    "a2a._id": 0,
                    "hotel._id": 0,
                    "starCategory._id": 0,
                    "quotation._id": 0,
                    "flight._id": 0,
                    "insurance._id": 0,
                    "transfer._id": 0,
                    createdAt: 0,
                    updatedAt: 0,
                    resellerIds: 0,
                    __v: 0,
                });

                if (!profile) {
                    return sendErrorResponse(res, 404, "profile not found");
                }

                const newB2BMarkupProfile = new B2BMarkupProfile({
                    selectedProfile: profile._id,
                    activities: profile.activities,
                    atoA: profile.atoA,
                    visa: profile.visa,
                    quotation: profile.quotation,
                    hotel: profile.hotel,
                    starCategory: profile.starCategory,
                    flight: profile.flight,
                    insurance: profile.insurance,
                    transfer: profile.transfer,
                    resellerId,
                });
                await newB2BMarkupProfile.save();
            }

            // more than one attraction and visa markup are there, so from here not possible to assign

            // if (status === "ok" && !attractionMarkupType == "") {
            //     await B2BSpecialAttractionMarkup.findOneAndUpdate(
            //         {
            //             resellerId: reseller._id,
            //         },
            //         {
            //             markupType: attractionMarkupType,
            //             markup: attractionMarkup,
            //         },
            //         { upsert: true, new: true }
            //     );
            // }

            // if (status === "ok" && !visaMarkupType == "") {
            //     await B2BSpecialVisaMarkup.findOneAndUpdate(
            //         {
            //             resellerId: reseller._id,
            //         },
            //         {
            //             markupType: visaMarkupType,
            //             markup: visaMarkup,
            //         },
            //         { upsert: true, new: true }
            //     );
            // }

            await Reseller.findByIdAndUpdate(resellerId, { status }, { runValidators: true });

            let email = reseller.email;
            if (reseller.status === "pending" && status === "ok") {
                sendResellerApprovalEmail({
                    email,
                    name: reseller?.name,
                    agentCode: reseller.agentCode,
                });
            } else if (status == "ok") {
                b2bAccountEnbaledEmail({ email, name: reseller?.name });
            } else if (status === "disabled") {
                b2bAccountDisabledEmail({ email, name: reseller?.name });
            } else {
                b2bAccountCancellationEmail({ email, name: reseller?.name });
            }

            res.status(200).json({
                message: `status successfully changed to ${status}`,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleResellerWithDetails: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid reseller id");
            }

            const reseller = await Reseller.findById(id)
                .populate("country", "countryName flag phonecode")
                .lean();

            if (!reseller) {
                return sendErrorResponse(res, 404, "Reseller not found");
            }

            const wallet = await B2BWallet.findOne({ reseller: reseller?._id });

            let totalEarnings = [];
            let pendingEarnings = [];
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
            }

            res.status(200).json({
                reseller,
                balance: wallet ? wallet.balance : 0,
                totalEarnings: totalEarnings[0]?.total || 0,
                pendingEarnings: pendingEarnings[0]?.total || 0,
                creditAmount: wallet?.creditAmount || 0,
                creditUsed: wallet?.creditUsed || 0,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleResellersSubagents: async (req, res) => {
        try {
            const { resellerId } = req.params;
            const { skip = 0, limit = 10 } = req.query;

            if (!isValidObjectId(resellerId)) {
                return sendErrorResponse(res, 400, "invalid reseller id");
            }

            const reseller = await Reseller.findById(resellerId);
            if (!reseller) {
                return sendErrorResponse(res, 404, "reseller not found");
            }

            const subAgents = await Reseller.find({ referredBy: resellerId })
                .populate("country", "flag phonecode countryName")
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();
            const totalSubAgents = await Reseller.find({
                referredBy: resellerId,
            }).count();

            res.status(200).json({
                subAgents,
                totalSubAgents,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleReseller: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid reseller id");
            }
            const reseller = await Reseller.findOne({ _id: id }).lean();
            if (!reseller) {
                return sendErrorResponse(res, 404, "reseller not found");
            }

            res.status(200).json(reseller);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateReseller: async (req, res) => {
        try {
            const { id } = req.params;
            const { country, password } = req.body;
            const { sendEmail = false } = req.query;

            const { _, error } = resellerUpdateSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(country)) {
                return sendErrorResponse(res, 400, "invalid country id");
            }
            const countryDetail = await Country.findOne({ _id: country, isDeleted: false });
            if (!countryDetail) {
                return sendErrorResponse(res, 404, "country not found");
            }

            let hashedPassowrd;
            if (password) {
                hashedPassowrd = await hash(password, 8);
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid reseller id");
            }
            const reseller = await Reseller.findOneAndUpdate(
                { _id: id },
                { ...req.body, password: hashedPassowrd ? hashedPassowrd : undefined },
                { runValidators: true, new: true }
            );
            if (!reseller) {
                return sendErrorResponse(res, 404, "reseller not found");
            }

            if (sendEmail === "true") {
                sendResellerUpdatedCredentials({
                    companyName: reseller.companyName,
                    email: reseller.email,
                    password: password ? password : "",
                    agentCode: reseller.agentCode,
                });
            }

            res.status(200).json({
                message: "reseller details successfully updated",
                agentCode: reseller?.agentCode,
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    addNewReseller: async (req, res) => {
        try {
            const { country, email } = req.body;

            const { _, error } = resellerAddSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const exReseller = await Reseller.findOne({ email });
            if (exReseller) {
                return sendErrorResponse(res, 400, "sorry, email already exists");
            }

            if (!isValidObjectId(country)) {
                return sendErrorResponse(res, 400, "invalid country id");
            }
            const countryDetail = await Country.findOne({ _id: country, isDeleted: false });
            if (!countryDetail) {
                return sendErrorResponse(res, 404, "country not found");
            }

            const password = crypto.randomBytes(6).toString("hex");
            const hashedPassowrd = await hash(password, 8);

            const newReseller = new Reseller({
                ...req.body,
                role: "reseller",
                password: hashedPassowrd,
            });
            await newReseller.save();
            await ResellerConfiguration.create({
                reseller: newReseller?._id,
                allowedPaymentMethods: ["wallet", "ccavenue", "pay-later"],
            });

            sendResellerCredentials({
                email: newReseller?.email,
                agentCode: newReseller?.agentCode,
                password,
                companyName: newReseller?.companyName,
            });

            res.status(200).json({
                messaage: "new reseller successfully added",
                agentCode: newReseller?.agentCode,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleResellerBasicInfo: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid reseller id");
            }
            const reseller = await Reseller.findOne({ _id: id, isDeleted: false, role: "reseller" })
                .select("companyName address website country city zipcode")
                .lean();
            if (!reseller) {
                return sendErrorResponse(res, 404, "reseller not found");
            }

            res.status(200).json(reseller);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    addNewSubAgent: async (req, res) => {
        try {
            const { country, email, referredBy } = req.body;

            const { _, error } = subAgentAddSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const exReseller = await Reseller.findOne({ email }).lean();
            if (exReseller) {
                return sendErrorResponse(res, 400, "sorry, email already exists");
            }

            if (!isValidObjectId(referredBy)) {
                return sendErrorResponse(res, 400, "invalid reseller id");
            }
            const reseller = await Reseller.findOne({ _id: referredBy, role: "reseller" }).lean();
            if (!reseller) {
                return sendErrorResponse(res, 400, "reseller not found");
            }
            const resellerConfig = await ResellerConfiguration.findOne({
                reseller: referredBy,
            }).lean();

            if (!isValidObjectId(country)) {
                return sendErrorResponse(res, 400, "invalid country id");
            }
            const countryDetail = await Country.findOne({ _id: country, isDeleted: false });
            if (!countryDetail) {
                return sendErrorResponse(res, 404, "country not found");
            }

            const password = crypto.randomBytes(6).toString("hex");
            const hashedPassowrd = await hash(password, 8);

            const newSubAgent = new Reseller({
                ...req.body,
                role: "sub-agent",
                password: hashedPassowrd,
                referredBy,
            });
            await newSubAgent.save();
            await ResellerConfiguration.create({
                reseller: newSubAgent?._id,
                showA2a: resellerConfig.showA2a || false,
                showAttraction: resellerConfig.showAttraction || false,
                showInsurance: resellerConfig.showInsurance || false,
                showFlight: resellerConfig.showFlight || false,
                showHotel: resellerConfig.showHotel || false,
                showQuotaion: resellerConfig.showQuotaion || false,
                showVisa: resellerConfig.showVisa || false,
                allowedPaymentMethods: resellerConfig.allowedPaymentMethods || [],
            });

            sendResellerCredentials({
                email: newSubAgent?.email,
                agentCode: newSubAgent?.agentCode,
                password,
                companyName: newSubAgent?.companyName,
            });

            res.status(200).json({
                messaage: "new sub agent successfully added",
                agentCode: newSubAgent?.agentCode,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateResellerConfigurations: async (req, res) => {
        try {
            const { id } = req.params;

            const {
                showA2a,
                showAttraction,
                showInsurance,
                showFlight,
                showHotel,
                showQuotaion,
                showVisa,

                // add api integration new changes
                showA2aApi,
                showAttractionApi,
                showInsuranceApi,
                showFlightApi,
                showHotelApi,
                showQuotaionApi,
                showVisaApi,
            } = req.body;

            const { error } = admResellerConfigurationSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid reseller id");
            }
            const reseller = await Reseller.findOne({ _id: id }).lean();
            if (!reseller) {
                return sendErrorResponse(res, 404, "reseller not found");
            }

            if (reseller.role === "sub-agent") {
                const referredBy = await Reseller.findOne({ _id: reseller.referredBy })
                    .populate("configuration")
                    .lean();

                if (!referredBy) {
                    return sendErrorResponse(res, 404, "sub-agent's parent reseller not found");
                }

                if (referredBy?.configuration?.showHotel !== true && showHotel === true) {
                    return sendErrorResponse(
                        res,
                        400,
                        "this sub-agent's parent does't have hotel option"
                    );
                }
                if (referredBy?.configuration?.showAttraction !== true && showAttraction === true) {
                    return sendErrorResponse(
                        res,
                        400,
                        "this sub-agent's parent does't have attraction option"
                    );
                }
                if (referredBy?.configuration?.showInsurance !== true && showInsurance === true) {
                    return sendErrorResponse(
                        res,
                        400,
                        "this sub-agent's parent does't have insurance option"
                    );
                }
                if (referredBy?.configuration?.showA2a !== true && showA2a === true) {
                    return sendErrorResponse(
                        res,
                        400,
                        "this sub-agent's parent does't have a2a option"
                    );
                }
                if (referredBy?.configuration?.showFlight !== true && showFlight === true) {
                    return sendErrorResponse(
                        res,
                        400,
                        "this sub-agent's parent does't have flight option"
                    );
                }
                if (referredBy?.configuration?.showQuotaion !== true && showQuotaion === true) {
                    return sendErrorResponse(
                        res,
                        400,
                        "this sub-agent's parent does't have quotation option"
                    );
                }
                if (referredBy?.configuration?.showVisa !== true && showVisa === true) {
                    return sendErrorResponse(
                        res,
                        400,
                        "this sub-agent's parent does't have visa option"
                    );
                }
            }

            const config = await ResellerConfiguration.findOne({ reseller: id });

            if (config && config.isApi_available === false) {
                if (
                    req.body.showA2aApi ||
                    req.body.showAttractionApi ||
                    req.body.showHotelApi ||
                    req.body.showVisaApi ||
                    req.body.showInsuranceApi ||
                    req.body.showQuotaionApi
                ) {
                    config.showAttractionApi = false;
                    config.showA2aApi = false;
                    config.showFlightApi = false;
                    config.showHotelApi = false;
                    config.showInsuranceApi = false;
                    config.showQuotaionApi = false;
                    config.showVisaApi = false;
                    await config.save();

                    req.body.showA2aApi = false;
                    req.body.showAttractionApi = false;
                    req.body.showHotelApi = false;
                    req.body.showVisaApi = false;
                    req.body.showInsuranceApi = false;
                    req.body.showQuotaionApi = false;
                    req.body.showFlightApi = false;
                }
            }

            const resellerConfig = await ResellerConfiguration.findOneAndUpdate(
                { reseller: id },
                { ...req.body, reseller: id },
                { runValidators: true, new: true, upsert: true }
            );

            res.status(200).json({
                message: "reseller configurations updated successfully",
                resellerConfig,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    addSubAgentApiAccess: async (req, res) => {
        try {
            const { id } = req.params;

            const { isApi_available } = req.body;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid reseller id");
            }

            const reseller = await Reseller.findOne({ _id: id }).lean();
            if (!reseller) {
                return sendErrorResponse(res, 404, "reseller not found");
            }

            const config = await ResellerConfiguration.findOne({ reseller: id });

            if (config) {
                config.isApi_available = isApi_available;
                await config.save();
            }

            if (config.isApi_available === false) {
                config.showAttractionApi = false;
                config.showA2aApi = false;
                config.showFlightApi = false;
                config.showHotelApi = false;
                config.showInsuranceApi = false;
                config.showQuotaionApi = false;

                await config.save();
            }

            res.status(200).json(config);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleResellerConfigurations: async (req, res) => {
        try {
            const { id } = req.params;

            const reseller = await Reseller.findOne({ _id: id })
                .populate("configuration")
                .select("companyName agentCode configuration email")
                .lean();
            if (!reseller) {
                return sendErrorResponse(res, 404, "reseller not found");
            }

            res.status(200).json(reseller);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    createB2BResellersExcelSheet: async (req, res) => {
        try {
            const { skip = 0, limit = 10, status, searchQuery, role, country } = req.query;

            const filters = {};
            if (role && role !== "") {
                filters.role = role;
            }

            if (status && status !== "") {
                filters.status = status;
            }

            if (searchQuery && searchQuery !== "") {
                filters.$or = [
                    {
                        companyName: {
                            $regex: searchQuery,
                            $options: "i",
                        },
                    },
                    {
                        email: {
                            $regex: searchQuery,
                            $options: "i",
                        },
                    },
                    {
                        agentCode: !isNaN(searchQuery) ? Number(searchQuery) : "",
                    },
                ];
            }

            if (country) {
                filters.country = country;
            }

            const resellers = await Reseller.find(filters)
                .populate("country", "countryName")
                .populate("referredBy", "companyName agentCode")
                .select(
                    "agentCode country companyName email avatar name website phoneNumber status"
                )
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            var wb = new xl.Workbook();
            var ws = wb.addWorksheet("Resellers");
            const titleStyle = wb.createStyle({
                font: {
                    bold: true,
                },
            });

            ws.cell(1, 1).string("Ref No").style(titleStyle);
            ws.cell(1, 2).string("Agent Code").style(titleStyle);
            ws.cell(1, 3).string("Company Name").style(titleStyle);
            ws.cell(1, 4).string("User").style(titleStyle);
            ws.cell(1, 5).string("Email").style(titleStyle);
            ws.cell(1, 6).string("Country").style(titleStyle);
            ws.cell(1, 7).string("Phone Number").style(titleStyle);

            for (let i = 0; i < resellers.length; i++) {
                const data = resellers[i];

                ws.cell(i + 2, 1).number(i + 1);
                ws.cell(i + 2, 2).number(data?.agentCode);
                ws.cell(i + 2, 3).string(data?.companyName || "N/A");
                ws.cell(i + 2, 4).string(data?.name || "N/A");
                ws.cell(i + 2, 5).string(data?.email || "N/A");
                ws.cell(i + 2, 6).string(data?.country?.countryName || "N/A");
                ws.cell(i + 2, 7).string(data?.phoneNumber || "N/A");
            }

            wb.write(`B2BList.xlsx`, res);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateResellerPasswordAndSendEmail: async (req, res) => {
        try {
            const { resellerId, password } = req.body;
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    checkShortNameAvailabilty: async (req, res) => {
        try {
            const { search } = req.query;
            const { id } = req.params;

            if (search.length < 3 || search.length > 5) {
                return sendErrorResponse(res, 404, "shortName should contain only 3 to 5 letters");
            }

            const filter = { _id: { $ne: id } };

            if (search && search !== "") {
                filter.shortName = search;
            }
            const shortName = await Reseller.findOne(filter).lean();
            if (shortName) {
                return sendErrorResponse(res, 404, "shortName already exists");
            }

            res.status(200).json({ message: "short name is available " });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateShortNameReseller: async (req, res) => {
        try {
            const { id } = req.params;
            const { shortName } = req.body;

            if (!shortName) {
                return sendErrorResponse(res, 400, "short name not found");
            }

            const checkExist = await Reseller.findOne({
                _id: { $ne: id },
                shortName: shortName,
            }).lean();
            if (checkExist) {
                return sendErrorResponse(res, 404, "shortName already exists");
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid reseller id");
            }
            const reseller = await Reseller.findOneAndUpdate(
                { _id: id },
                { shortName },
                { runValidators: true, new: true }
            );
            if (!reseller) {
                return sendErrorResponse(res, 404, "reseller not found");
            }

            res.status(200).json({
                message: "reseller details successfully updated",
                agentCode: reseller?.agentCode,
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllResellersList: async (req, res) => {
        try {
            const resellers = await Reseller.find({ status: "ok" })
                .populate("country", "countryName logo phonecode")
                .populate("referredBy", "companyName agentCode")
                .select(
                    "agentCode country companyName email avatar name website phoneNumber status"
                )
                .select("name companyName")
                .sort({ createdAt: -1 })
                .lean();

            res.status(200).json({
                resellers,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
