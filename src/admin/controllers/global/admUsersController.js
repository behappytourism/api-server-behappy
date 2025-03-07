const { sendErrorResponse } = require("../../../helpers");
const {
    User,
    AffiliateClickHistory,
    AffiliatePointHistory,
    B2CWallet,
} = require("../../../models");
const { isValidObjectId, Types } = require("mongoose");
const xl = require("excel4node");

module.exports = {
    getAllUsers: async (req, res) => {
        try {
            const { limit = 10, skip = 0, status, searchQuery, country } = req.query;
            const filters = {};

            if (status && status !== "") {
                filters.status = status;
            }

            if (searchQuery && searchQuery !== "") {
                filters.$or = [
                    {
                        name: {
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
                ];
            }

            if (country) {
                filters.country = country;
            }

            const users = await User.find(filters)
                .populate("country")
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalUsers = await User.find(filters).count();

            res.status(200).json({
                users,
                totalUsers,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleUserDetails: async (req, res) => {
        try {
            const { userId } = req.params;
            const user = await User.aggregate([
                {
                    $match: {
                        _id: Types.ObjectId(userId),
                    },
                },
                {
                    $lookup: {
                        from: "countries", // Replace with the actual name of the "country" collection
                        localField: "country", // Replace with the actual field name in the User collection
                        foreignField: "_id", // Replace with the actual field name in the Country collection
                        as: "countryData",
                    },
                },
                {
                    $lookup: {
                        from: "affiliateusers", // Replace with the actual name of the "country" collection
                        localField: "_id", // Replace with the actual field name in the User collection
                        foreignField: "user", // Replace with the actual field name in the Country collection
                        as: "affiliateDetails",
                    },
                },
                {
                    $set: {
                        affiliateDetails: {
                            $arrayElemAt: ["$affiliateDetails", 0],
                        },
                        country: {
                            $arrayElemAt: ["$countryData", 0],
                        },
                    },
                },
            ]);

            if (!user[0]) {
                return sendErrorResponse(res, 400, "user not found");
            }

            const totalClicks = await AffiliateClickHistory.aggregate([
                // { $match: { clickType: "attraction" } },
                { $match: { user: Types.ObjectId(userId) } },

                {
                    $group: {
                        _id: null,
                        totalClicks: { $sum: 1 },
                    },
                },
            ]);

            const totalPoints = await AffiliatePointHistory.aggregate([
                // { $match: { status: "success" } },
                { $match: { user: Types.ObjectId(userId) } },

                {
                    $group: {
                        _id: null,
                        totalTransation: { $sum: 1 },
                        totalPoints: { $sum: "$points" },
                    },
                },
            ]);

            const walletBalance = await B2CWallet.findOne({ user: Types.ObjectId(userId) });

            res.status(200).json({
                user: user[0],
                totalClicks: totalClicks[0]?.totalClicks || 0,
                totalPoints: totalPoints[0]?.totalPoints || 0,
                totalTransation: totalPoints[0]?.totalTransation || 0,
                balance: walletBalance.balance || 0,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    createUserExcelSheet: async (req, res) => {
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
                        name: {
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
                ];
            }

            if (country) {
                filters.country = country;
            }

            const users = await User.find(filters)
                .populate("country", "countryName")
                .select("country companyName email  name website phoneNumber status")
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
            ws.cell(1, 2).string("User").style(titleStyle);
            ws.cell(1, 3).string("Email").style(titleStyle);
            ws.cell(1, 4).string("Country").style(titleStyle);
            ws.cell(1, 5).string("Phone Number").style(titleStyle);

            for (let i = 0; i < users.length; i++) {
                const data = users[i];

                ws.cell(i + 2, 1).number(i + 1);
                ws.cell(i + 2, 2).string(data?.name || "N/A");
                ws.cell(i + 2, 3).string(data?.email || "N/A");
                ws.cell(i + 2, 4).string(data?.country?.countryName || "N/A");
                ws.cell(i + 2, 5).string(data?.phoneNumber || "N/A");
            }

            wb.write(`user.xlsx`, res);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllUsersList: async (req, res) => {
        try {
            const users = await User.find().populate("country").sort({ createdAt: -1 }).lean();

            res.status(200).json({
                users,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
