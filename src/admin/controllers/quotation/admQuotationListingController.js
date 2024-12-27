const { Types, isValidObjectId } = require("mongoose");
const { sendErrorResponse } = require("../../../helpers");
const {
    ExcursionQuotation,
    ExcSupplementsQuotation,
    Visa,
    TransferQuotation,
    HotelQuotation,
    QuotationAmendment,
    VisaType,
    VehicleType,
    AttractionActivity,
    Quotation,
    Transfer,
    Airport,
    GroupArea,
    VisaNationality,
    Excursion,
} = require("../../../models");

const { Area, City } = require("../../../models/global");
const AdminB2bAccess = require("../../../models/global/adminAccess.model");

const Vehicle = require("../../../models/transfer/vehicle.model");
const { singleRoomTypeRate, createQtnSheet, createPdf } = require("../../../b2b/helpers/quotation");
const { B2BMarkupProfile, Reseller } = require("../../../b2b/models");
const { Hotel } = require("../../../models/hotel");
const sentQuotationEmail = require("../../../helpers/quotaion/quotationEmail");
const { MarketStrategy } = require("../../models");

module.exports = {
    listResellerQuotation: async (req, res) => {
        try {
            const { searchQuery } = req.query;

            const filter = {};

            if (searchQuery && searchQuery !== "") {
                filter["reseller.companyName"] = { $regex: searchQuery, $options: "i" };
            }

            let checkSuperAdmin = req.admin.roles.find((role) => {
                return role.roleName.toLowerCase() === "super admin";
            });

            if (checkSuperAdmin) {
                pipeline = [
                    {
                        $match: { isResellerDisabled: false },
                    },

                    {
                        $lookup: {
                            from: "resellers",
                            localField: "reseller",
                            foreignField: "_id",
                            as: "reseller",
                        },
                    },
                    {
                        $set: {
                            reseller: {
                                $arrayElemAt: ["$reseller", 0],
                            },
                        },
                    },
                    {
                        $match: filter,
                    },
                    {
                        $lookup: {
                            from: "countries",
                            localField: "reseller.country",
                            foreignField: "_id",
                            as: "country",
                        },
                    },
                    {
                        $set: {
                            "reseller.country": {
                                $arrayElemAt: ["$country", 0],
                            },
                        },
                    },
                    {
                        $group: {
                            _id: "$reseller._id",
                            totalQuotation: {
                                $sum: {
                                    $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0],
                                },
                            },
                            resellerData: { $first: "$reseller" },
                        },
                    },
                ];
            } else {
                pipeline = [
                    {
                        $match: { isResellerDisabled: false },
                    },

                    {
                        $lookup: {
                            from: "resellers",
                            localField: "reseller",
                            foreignField: "_id",
                            as: "resellers",
                        },
                    },
                    {
                        $lookup: {
                            from: "adminaccesses",
                            localField: "reseller",
                            foreignField: "reseller",
                            as: "adminAccess",
                        },
                    },
                    {
                        $lookup: {
                            from: "admins",
                            localField: "createdBy",
                            foreignField: "_id",
                            as: "admin",
                        },
                    },
                    {
                        $set: {
                            admin: { $arrayElemAt: ["$admin", 0] },
                            adminAccess: { $arrayElemAt: ["$adminAccess", 0] },
                            reseller: { $arrayElemAt: ["$resellers", 0] },
                        },
                    },
                    {
                        $match: filter,
                    },
                    {
                        $match: {
                            $or: [
                                {
                                    "adminAccess.quotations": {
                                        $elemMatch: { $eq: Types.ObjectId(req.admin._id) },
                                    },
                                },
                                {
                                    createdBy: { $eq: Types.ObjectId(req.admin._id) },
                                },
                            ],
                        },
                    },
                    {
                        $lookup: {
                            from: "countries",
                            localField: "reseller.country",
                            foreignField: "_id",
                            as: "country",
                        },
                    },
                    {
                        $set: {
                            "reseller.country": {
                                $arrayElemAt: ["$country", 0],
                            },
                        },
                    },
                    {
                        $group: {
                            _id: "$reseller._id",
                            totalQuotation: {
                                $sum: {
                                    $cond: [{ $eq: ["$status", "confirmed"] }, 1, 0],
                                },
                            },
                            resellerData: { $first: "$reseller" },
                        },
                    },
                ];
            }

            const quotations = await Quotation.aggregate(pipeline);
            console.log(quotations);

            res.status(200).json({ results: quotations });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    singleResellerQuotation: async (req, res) => {
        try {
            const { skip = 0, limit = 10, quotationNumber, dateFrom, dateTo } = req.query;

            const { resellerId } = req.params;
            const filters = {};

            if (quotationNumber && quotationNumber !== "") {
                filters.quotationNumber = quotationNumber;
            }

            if (dateFrom && dateFrom !== "") {
                filters.updatedAt = { $gte: new Date(dateFrom) };
            }

            if (dateTo && dateTo !== "") {
                filters.updatedAt = {
                    ...filters.updatedAt,
                    $lte: new Date(new Date(dateTo).setDate(new Date(dateTo).getDate() + 1)),
                };
            }

            pipeline = [
                {
                    $match: { reseller: Types.ObjectId(resellerId) },
                },
                {
                    $match: filters,
                },
                {
                    $lookup: {
                        from: "quotationamendments",
                        localField: "quotationNumber",
                        foreignField: "quotationNumber",
                        as: "amendments",
                    },
                },
                {
                    $addFields: {
                        isConfirmed: {
                            $reduce: {
                                input: "$amendments",
                                initialValue: false,
                                in: {
                                    $cond: [
                                        { $eq: ["$$this.status", "confirmed"] },
                                        true,
                                        "$$value",
                                    ],
                                },
                            },
                        },
                    },
                },
                {
                    $lookup: {
                        from: "resellers",
                        localField: "reseller",
                        foreignField: "_id",
                        as: "resellers",
                    },
                },
                {
                    $lookup: {
                        from: "admins",
                        localField: "createdBy",
                        foreignField: "_id",
                        as: "admin",
                    },
                },
                {
                    $set: {
                        admin: { $arrayElemAt: ["$admin", 0] },
                        reseller: { $arrayElemAt: ["$resellers", 0] },
                    },
                },
                {
                    $project: {
                        quotationNumber: 1,
                        reseller: {
                            name: 1,
                            email: 1,
                        },
                        admin: {
                            email: 1,
                        },
                        createdBy: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        totalAmendments: 1,
                        status: 1,
                    },
                },
                {
                    $sort: {
                        createdAt: -1,
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalOrders: { $sum: 1 },
                        data: { $push: "$$ROOT" },
                    },
                },
                {
                    $project: {
                        totalOrders: 1,
                        data: {
                            $slice: ["$data", Number(limit) * Number(skip), Number(limit)],
                        },
                    },
                },
            ];

            const quotations = await Quotation.aggregate(pipeline);
            res.status(200).json({
                quotations: quotations[0]?.data || [],
                totalQuotations: quotations[0]?.totalOrders || 0,
            });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },
};
