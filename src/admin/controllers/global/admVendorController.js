const { Vendor, B2bUser, VendorConfiguration } = require("../../../b2b/models");
const { sendErrorResponse } = require("../../../helpers");
const { Country } = require("../../../models");
const {
    vendorAddSchema,
    vendorUpdateSchema,
} = require("../../validations/vendor/admVendor.schema");
const { isValidObjectId, Types } = require("mongoose");
const { hash } = require("bcryptjs");
const crypto = require("crypto");
const xl = require("excel4node");

module.exports = {
    getAllVendors: async (req, res) => {
        try {
            const { skip = 0, limit = 10, status, searchQuery, role, country } = req.query;

            const filters = {};

            if (status && status !== "") {
                filters.status = status;
            }

            if (searchQuery && searchQuery !== "") {
                filters.$or = [
                    {
                        ["b2bUserId.companyName"]: {
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
                        vendorCode: !isNaN(searchQuery) ? Number(searchQuery) : "",
                    },
                ];
            }

            const vendors = await Vendor.find(filters)
                .populate({
                    path: "b2bUserId",
                    populate: {
                        path: "country",
                        select: "countryName logo phonecode",
                        model: "Country", // Assuming the model name for country is Country
                        as: "b2bUserCountry", // Use a custom name for the populated field
                    },
                })
                .select("vendorCode email avatar name website phoneNumber status")
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalvendors = await Vendor.find(filters).count();

            res.status(200).json({
                vendors,
                skip: Number(skip),
                limit: Number(limit),
                totalvendors,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    changevendorStatus: async (req, res) => {
        try {
            const { vendorId } = req.params;
            const { status, formData } = req.body;

            const { _, error } = vendorStatusUpdateSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(
                    res,
                    400,
                    error.details ? error?.details[0]?.message : error.message
                );
            }

            if (!isValidObjectId(vendorId)) {
                return sendErrorResponse(res, 400, "Invalid vendor id");
            }
            const vendor = await Vendor.findById(vendorId).lean();
            if (!vendor) {
                return sendErrorResponse(res, 404, "vendor not found");
            }

            await Vendor.findByIdAndUpdate(vendorId, { status }, { runValidators: true });

            let email = vendor.email;

            res.status(200).json({
                message: `status successfully changed to ${status}`,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleVendor: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid vendor id");
            }
            const vendor = await Vendor.findOne({ _id: id }).populate("b2bUserId").lean();
            if (!vendor) {
                return sendErrorResponse(res, 404, "vendor not found");
            }

            const {
                designation,
                name,
                phoneNumber,
                email,
                skypeId,
                whatsappNumber,
                telephoneNumber,
                status,
                b2bUserId,
            } = vendor;

            const {
                companyName,
                address,
                website,
                country,
                city,
                zipCode,
                trnNumber,
                companyRegistration,
                shortName,
            } = b2bUserId;

            res.status(200).json({
                companyName,
                address,
                website,
                country,
                city,
                zipCode,
                designation,
                name,
                phoneNumber,
                email,
                skypeId,
                whatsappNumber,
                trnNumber,
                companyRegistration,
                telephoneNumber,
                status,
                shortName,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    addNewVendor: async (req, res) => {
        try {
            const { country, email } = req.body;

            const { _, error } = vendorAddSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const exvendor = await Vendor.findOne({ email });
            if (exvendor) {
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

            const newB2bUser = new B2bUser({
                ...req.body,
            });
            await newB2bUser.save();

            const newVendor = new Vendor({
                ...req.body,
                password: hashedPassowrd,
                b2bUserId: newB2bUser._id,
            });
            await newVendor.save();

            await VendorConfiguration.create({
                vendor: newVendor?._id,
                allowedPaymentMethods: ["wallet", "ccavenue", "pay-later"],
            });

            res.status(200).json({
                messaage: "new vendor successfully added",
                vendorCode: newVendor?.vendorCode,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateVendor: async (req, res) => {
        try {
            const { id } = req.params;
            const { country, password } = req.body;
            const { sendEmail = false } = req.query;

            const { _, error } = vendorUpdateSchema.validate(req.body);
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
            const vendor = await Vendor.findOneAndUpdate(
                { _id: id },
                { ...req.body, password: hashedPassowrd ? hashedPassowrd : undefined },
                { runValidators: true, new: true }
            );
            if (!vendor) {
                return sendErrorResponse(res, 404, "vendor not found");
            }

            const newB2bUser = await B2bUser.findOneAndUpdate(
                { _id: vendor.b2bUserId },
                {
                    ...req.body,
                }
            );

            if (!newB2bUser) {
                return sendErrorResponse(res, 404, "user not found");
            }

            await VendorConfiguration.create({
                vendor: vendor?._id,
                allowedPaymentMethods: ["wallet", "ccavenue", "pay-later"],
            });

            res.status(200).json({
                message: "vendor details successfully updated",
                agentCode: vendor?.vendorCode,
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSinglevendorBasicInfo: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid vendor id");
            }
            const vendor = await Vendor.findOne({ _id: id, isDeleted: false, role: "vendor" })
                .select("companyName address website country city zipcode")
                .lean();
            if (!vendor) {
                return sendErrorResponse(res, 404, "vendor not found");
            }

            res.status(200).json(vendor);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    createVendorsExcelSheet: async (req, res) => {
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

            const vendors = await Vendor.find(filters)
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
            var ws = wb.addWorksheet("vendors");
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

            for (let i = 0; i < vendors.length; i++) {
                const data = vendors[i];

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
            const shortName = await Vendor.findOne(filter).lean();
            if (shortName) {
                return sendErrorResponse(res, 404, "shortName already exists");
            }

            res.status(200).json({ message: "short name is available " });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateShortNameVendor: async (req, res) => {
        try {
            const { id } = req.params;
            const { shortName } = req.body;

            if (!shortName) {
                return sendErrorResponse(res, 400, "short name not found");
            }

            const checkExist = await Vendor.findOne({
                _id: { $ne: id },
                shortName: shortName,
            }).lean();
            if (checkExist) {
                return sendErrorResponse(res, 404, "shortName already exists");
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid vendor id");
            }
            const vendor = await Vendor.findOneAndUpdate(
                { _id: id },
                { shortName },
                { runValidators: true, new: true }
            );
            if (!vendor) {
                return sendErrorResponse(res, 404, "vendor not found");
            }

            res.status(200).json({
                message: "vendor details successfully updated",
                agentCode: vendor?.agentCode,
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllVendorsList: async (req, res) => {
        try {
            const vendors = await Vendor.find({ status: "ok" })
                .populate("country", "countryName logo phonecode")
                .populate("referredBy", "companyName agentCode")
                .select(
                    "agentCode country companyName email avatar name website phoneNumber status"
                )
                .select("name companyName")
                .sort({ createdAt: -1 })
                .lean();

            res.status(200).json({
                vendors,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
    getSingleVendorWithDetails: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid Vendor id");
            }

            const vendor = await Vendor.findById(id)
                .populate({
                    path: "b2bUserId",
                    populate: {
                        path: "country",
                        select: "countryName logo phonecode",
                        model: "Country", // Assuming the model name for country is Country
                        as: "b2bUserCountry", // Use a custom name for the populated field
                    },
                })
                .lean();

            if (!vendor) {
                return sendErrorResponse(res, 404, "vendor not found");
            }

            res.status(200).json({
                vendor,
                balance: 0,
                totalEarnings: 0,
                pendingEarnings: 0,
                creditAmount: 0,
                creditUsed: 0,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateVendorConfigurations: async (req, res) => {
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
            } = req.body;

            // const { error } = admResellerConfigurationSchema.validate(req.body);
            // if (error) {
            //     return sendErrorResponse(res, 400, error.details[0].message);
            // }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid vendor id");
            }
            const vendor = await Vendor.findOne({ _id: id }).lean();
            if (!vendor) {
                return sendErrorResponse(res, 404, "vendor not found");
            }

            const vendorConfig = await VendorConfiguration.findOneAndUpdate(
                { vendor: id },
                { ...req.body, vendor: id },
                { runValidators: true, new: true, upsert: true }
            );

            res.status(200).json({
                message: "vendor configurations updated successfully",
                vendorConfig,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleVendorConfigurations: async (req, res) => {
        try {
            const { id } = req.params;

            const vendor = await VendorConfiguration.findOne({ vendor: id })
                .populate("vendor")
                // .select("companyName agentCode configuration email")
                .lean();
            if (!vendor) {
                return sendErrorResponse(res, 404, "vendor not found");
            }

            res.status(200).json(vendor);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
