const { hash, compare } = require("bcryptjs");
const crypto = require("crypto");
const { isValidObjectId } = require("mongoose");
const fs = require("fs");
const { parse } = require("csv-parse");

const { sendErrorResponse, sendAdminPassword } = require("../../../helpers");
const { Admin, AdminRole } = require("../../models");
const {
    adminAddSchema,
    adminLoginSchema,
    adminPasswordUpdateSchema,
} = require("../../validations/adminAuth.schema");
const { sendQtnWelcomeEmail } = require("../../helpers/quotation");
const { Country } = require("../../../models");

module.exports = {
    addNewAdmin: async (req, res) => {
        try {
            const {
                name,
                email,
                phoneNumber,
                designation,
                joinedDate,
                city,
                country,
                description,
                roles,
            } = req.body;

            const parsedRoles = roles ? JSON.parse(roles) : [];
            const { _, error } = adminAddSchema.validate({
                ...req.body,
                roles: parsedRoles,
            });
            if (error) {
                return sendErrorResponse(
                    res,
                    400,
                    error.details ? error.details[0].message : error.message
                );
            }

            let avatarImg;
            if (req.file?.path) {
                avatarImg = "/" + req.file.path.replace(/\\/g, "/");
            }

            const admin = await Admin.findOne({ email });
            if (admin) {
                return sendErrorResponse(res, 400, "email already exists");
            }

            for (let i = 0; i < parsedRoles?.length; i++) {
                if (!isValidObjectId(parsedRoles[i])) {
                    return sendErrorResponse(res, 400, "invalid admin role id");
                }
                const adminRole = await AdminRole.findById(parsedRoles[i]);
                if (!adminRole) {
                    return sendErrorResponse(res, 404, "admin role not found");
                }
            }

            const password = crypto.randomBytes(6).toString("hex");
            const hashedPassowrd = await hash(password, 8);

            const countryDetail = await Country.findOne({ isocode: country?.toUpperCase() }).lean();
            if (!countryDetail) {
                return sendErrorResponse(res, 400, `country ${country} not found`);
            }

            const newAdmin = new Admin({
                name,
                email,
                password: hashedPassowrd,
                avatar: avatarImg,
                phoneNumber,
                designation,
                joinedDate,
                city,
                country,
                description,
                roles: parsedRoles,
                role: "admin",
            });
            await newAdmin.save();

            sendAdminPassword({ name: newAdmin.name, email, password });

            res.status(200).json(newAdmin);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    adminLogin: async (req, res) => {
        try {
            const { email, password } = req.body;

            const { _, error } = adminLoginSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const admin = await Admin.findOne({ email }).populate("roles");
            if (!admin) {
                return sendErrorResponse(res, 400, "Account not found. Invalid credentials");
            }

            const isMatch = await compare(password, admin.password);
            if (!isMatch) {
                return sendErrorResponse(res, 400, "Account not found. Invalid credentials");
            }

            const jwtToken = await admin.generateAuthToken();
            admin.lastLoggedIn = new Date();
            await admin.save();

            res.status(200).json({ admin, jwtToken });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    refreshAdminToken: async (req, res) => {
        try {
            const { refreshToken } = req.body;

            if (!refreshToken) {
                return sendErrorResponse(res, 400, "Refresh token is required");
            }

            jwt.verify(refreshToken, secretKey, (err, decoded) => {
                if (err) {
                    return sendErrorResponse(res, 400, "Invalid refresh token");
                }

                const newAccessToken = jwt.sign({ userId: decoded.userId }, secretKey, {
                    expiresIn: accessTokenExpiration,
                });

                res.json({ accessToken: newAccessToken });
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllAdmins: async (req, res) => {
        try {
            const { skip = 0, limit = 10, searchQuery } = req.query;

            const filters = {};
            if (searchQuery && searchQuery !== "") {
                filters.$or = [
                    { name: { $regex: searchQuery, $options: "i" } },
                    { email: { $regex: searchQuery, $options: "i" } },
                ];
            }

            const admins = await Admin.find(filters)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .populate("roles", "roleName")
                .lean();

            const totalAdmins = await Admin.find(filters).count();

            res.status(200).json({
                admins,
                totalAdmins,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteAdmin: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid admin id");
            }

            const admin = await Admin.findOneAndDelete({
                _id: id,
            });
            if (!admin) {
                return sendErrorResponse(res, 404, "Admin not found");
            }

            res.status(200).json({
                message: "Admin deleted successfully",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAdmin: async (req, res) => {
        try {
            res.status(200).json(req.admin);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateAdminDetails: async (req, res) => {
        try {
            const {
                email,
                name,
                phoneNumber,
                designation,
                joinedDate,
                city,
                country,
                description,
            } = req.body;

            let avatarImg;
            if (req.file?.path) {
                avatarImg = "/" + req.file.path.replace(/\\/g, "/");
            }

            const countryDetail = await Country.findOne({ isocode: country?.toUpperCase() }).lean();
            if (!countryDetail) {
                return sendErrorResponse(res, 400, `country ${country} not found`);
            }

            const admin = await Admin.findOneAndUpdate(
                { _id: req.admin?._id },
                {
                    email,
                    name,
                    phoneNumber,
                    designation,
                    joinedDate,
                    city,
                    country,
                    description,
                    avatar: avatarImg,
                },
                { runValidators: true, new: true }
            );

            if (!admin) {
                return sendErrorResponse(res, 404, "Admin not found");
            }

            const adminDetails = await Admin.findOne({ _id: req.admin?._id })
                .populate("roles")
                .lean();

            res.status(200).json(adminDetails);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateAdminPassword: async (req, res) => {
        try {
            const { oldPassword, newPassword } = req.body;

            const { _, error } = adminPasswordUpdateSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(
                    res,
                    400,
                    error.details ? error?.details[0]?.message : error.message
                );
            }

            const isMatch = await compare(oldPassword, req.admin.password);
            if (!isMatch) {
                return sendErrorResponse(res, 400, "Old password is incorrect");
            }

            const hashedPassowrd = await hash(newPassword, 8);
            const admin = await Admin.findOneAndUpdate(
                { _id: req.admin._id },
                { password: hashedPassowrd }
            );

            if (!admin) {
                return sendErrorResponse(res, 404, "User not found");
            }

            res.status(200).json({ message: "Password updated successfully" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleAdmin: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid admin id");
            }

            const admin = await Admin.findById(id);
            if (!admin) {
                return sendErrorResponse(res, 404, "Admin not found");
            }

            res.status(200).json(admin);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateSingleAdmin: async (req, res) => {
        try {
            const { id } = req.params;
            const {
                email,
                name,
                phoneNumber,
                designation,
                joinedDate,
                city,
                country,
                description,
                roles,
                password,
            } = req.body;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid admin id");
            }

            const parsedRoles = roles ? JSON.parse(roles) : [];
            const { _, error } = adminAddSchema.validate({ ...req.body, roles: parsedRoles });
            if (error) {
                return sendErrorResponse(
                    res,
                    400,
                    error.details ? error.details[0].message : error.message
                );
            }

            let avatarImg;
            if (req.file?.path) {
                avatarImg = "/" + req.file.path.replace(/\\/g, "/");
            }

            for (let i = 0; i < parsedRoles?.length; i++) {
                if (!isValidObjectId(parsedRoles[i])) {
                    return sendErrorResponse(res, 400, "invalid admin role id");
                }
                const adminRole = await AdminRole.findById(parsedRoles[i]);
                if (!adminRole) {
                    return sendErrorResponse(res, 404, "admin role not found");
                }
            }

            const countryDetail = await Country.findOne({ isocode: country?.toUpperCase() }).lean();
            if (!countryDetail) {
                return sendErrorResponse(res, 400, `country ${country} not found`);
            }

            const hashedPassowrd = await hash(password, 8);

            const admin = await Admin.findOneAndUpdate(
                { _id: id },
                {
                    email,
                    name,
                    phoneNumber,
                    designation,
                    joinedDate,
                    city,
                    country,
                    description,
                    avatar: avatarImg,
                    roles: parsedRoles,
                    password: password ? hashedPassowrd : undefined,
                },
                { runValidators: true, new: true }
            );

            if (!admin) {
                return sendErrorResponse(res, 404, "Admin not found");
            }

            if (password) {
                sendAdminPassword({ name: admin.name, email: admin.email, password });
            }

            res.status(200).json({
                message: "Admin details succesfully updated",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    addQtnAdminsFromCsv: async (req, res) => {
        try {
            if (!req.file) {
                return sendErrorResponse(res, 500, "CSV file is required");
            }

            let csvRow = 0;
            let adminsList = [];
            let newAdmins = [];
            let errorAdmins = [];
            const uploadAndCreateAdmins = async () => {
                for (let i = 0; i < adminsList?.length; i++) {
                    try {
                        const password = crypto.randomBytes(6).toString("hex");
                        const hashedPassowrd = await hash(password, 8);

                        const admin = await Admin.findOneAndUpdate(
                            {
                                email: adminsList[i].email,
                            },
                            {
                                name: adminsList[i].name,
                                email: adminsList[i].email,
                                phoneNumber: adminsList[i].phoneNumber,
                                designation: adminsList[i].designation,
                                country: adminsList[i].country,
                                password: hashedPassowrd,
                                roles: ["64db315e71dfc6f8354c863f"],
                            },
                            { new: true, runValidators: true, upsert: true }
                        );

                        newAdmins.push(Object(admin));

                        sendQtnWelcomeEmail({ email: adminsList[i].email, password });
                    } catch (err) {
                        console.log(err);
                        errorAdmins.push(adminsList[i]?.email);
                    }
                }
            };

            fs.createReadStream(req.file?.path)
                .pipe(parse({ delimiter: "," }))
                .on("data", async function (csvrow) {
                    if (csvRow !== 0) {
                        adminsList.push({
                            name: csvrow[0],
                            designation: csvrow[1],
                            country: csvrow[2],
                            phoneNumber: csvrow[3],
                            email: csvrow[4],
                        });
                    }
                    csvRow += 1;
                })
                .on("end", async function () {
                    await uploadAndCreateAdmins();

                    if (errorAdmins?.length > 0) {
                        return res.status(200).json({
                            status: "error",
                            message: `${errorAdmins} not uploaded, please try with correct details`,
                            newAdmins,
                        });
                    }

                    res.status(200).json({
                        message: "Tickets successfully uploaded",
                        status: "ok",
                        newAdmins,
                    });
                })
                .on("error", function (err) {
                    sendErrorResponse(res, 400, "Something went wrong, Wile parsing CSV");
                });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
