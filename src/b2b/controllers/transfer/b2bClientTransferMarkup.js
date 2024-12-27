const { Transfer } = require("../../../models");
const { B2BClientTransferMarkup } = require("../../models");
const { sendErrorResponse } = require("../../../helpers");
const { isValidObjectId, Types } = require("mongoose");

module.exports = {
    upsertB2bClientTransferMarkup: async (req, res) => {
        try {
            const { transferId, vehicleId, markup, markupType } = req.body;
            

            
            let clientMarkupTransfer = await B2BClientTransferMarkup.findOne({
                resellerId: req?.reseller?._id,
                transferId,
                isDeleted: false,
            });

            if (clientMarkupTransfer) {
                const vehicleIndex = clientMarkupTransfer?.vehicleType?.findIndex(
                    (a) => a?.vehicleId?.toString() === vehicleId?.toString()
                );

                console.log(vehicleIndex, "vehicleIndex");

                if (vehicleIndex !== -1) {
                    clientMarkupTransfer.vehicleType[vehicleIndex].markup = markup;
                    clientMarkupTransfer.vehicleType[vehicleIndex].markupType = markupType;
                } else {
                    clientMarkupTransfer.vehicleType.push({
                        vehicleId,
                        markup,
                        markupType,
                    });
                }
                await clientMarkupTransfer.save();
            } else {
                clientMarkupTransfer = B2BClientTransferMarkup.create({
                    transferId,
                    vehicleType: [{ vehicleId, markup, markupType }],
                    resellerId: req?.reseller?._id,
                });
            }

            res.status(200).json({ message: "clent markup added successfully" });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    getAllClientMarkupTransfers: async (req, res) => {
        try {
            const { skip = 0, limit = 10, transferFrom, transferTo, transferType } = req.query;

            let filters1 = {};

            if (transferType && transferType !== "" && transferType !== "area-area") {
                if (transferTo && transferTo !== "") {
                    filters1.transferTo = Types.ObjectId(transferTo);
                }

                if (transferFrom && transferFrom !== "") {
                    filters1.transferFrom = Types.ObjectId(transferFrom);
                }

                filters1.transferType = transferType;
            }

            let pipeline = [
                {
                    $match: {
                        isDeleted: false,
                        ...filters1,
                    },
                },
                {
                    $lookup: {
                        from: "groupareas",
                        localField: "transferFrom",
                        foreignField: "_id",
                        as: "transferFromGroup",
                    },
                },
                {
                    $lookup: {
                        from: "airports",
                        localField: "transferFrom",
                        foreignField: "_id",
                        as: "transferFromAirport",
                    },
                },
                {
                    $lookup: {
                        from: "groupareas",
                        localField: "transferTo",
                        foreignField: "_id",
                        as: "transferToGroup",
                    },
                },
                {
                    $lookup: {
                        from: "airports",
                        localField: "transferTo",
                        foreignField: "_id",
                        as: "transferToAirport",
                    },
                },
                {
                    $set: {
                        transferFromDetails: { $arrayElemAt: ["$transferFromGroup", 0] },
                        transferToDetails: { $arrayElemAt: ["$transferToGroup", 0] },
                    },
                },
                {
                    $addFields: {
                        transferFrom: {
                            $cond: [
                                {
                                    $or: [
                                        { $eq: ["$transferType", "group-group"] },
                                        { $eq: ["$transferType", "group-airport"] },
                                    ],
                                },
                                { $arrayElemAt: ["$transferFromGroup.name", 0] },
                                { $arrayElemAt: ["$transferFromAirport.airportName", 0] },
                            ],
                        },
                        transferTo: {
                            $cond: [
                                {
                                    $or: [
                                        { $eq: ["$transferType", "group-group"] },
                                        { $eq: ["$transferType", "airport-group"] },
                                    ],
                                },
                                { $arrayElemAt: ["$transferToGroup.name", 0] },
                                { $arrayElemAt: ["$transferToAirport.airportName", 0] },
                            ],
                        },
                    },
                },

                { $sort: { createdAt: -1 } },
                {
                    $group: {
                        _id: null,
                        totalTransfer: { $sum: 1 },
                        data: { $push: "$$ROOT" },
                    },
                },
                {
                    $project: {
                        totalTransfer: 1,
                        data: {
                            $slice: ["$data", Number(limit) * Number(skip), Number(limit)],
                        },
                    },
                },
            ];

            const transfer = await Transfer.aggregate(pipeline);

            // const profile = await MarketStrategy.findOne({ isDeleted: false, _id: profileId });
            const transferList = [];
            transfer[0]?.data?.forEach((transfer) => {
                // const transferMarkup = profile?.transfer?.find(
                //     (a) => a?.transferId?.toString() === transfer?._id?.toString()
                // );

                transferList.push({
                    transferId: transfer?._id,
                    transferFrom: transfer?.transferFrom,
                    transferTo: transfer?.transferTo,
                    // markupType: transferMarkup?.markupType || "flat",
                    // markup: transferMarkup?.markup || 0,
                });
            });

            res.status(200).json({
                transfers: transferList,
                totalTransfer: transfer[0].totalTransfer,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllClientMarkupTransferVehciles: async (req, res) => {
        try {
            const { transferId } = req.params;

            const transfer = await Transfer.findById(transferId).populate("vehicleType.vehicle");

            const transferMarkup = await B2BClientTransferMarkup.findOne({
                isDeleted: false,
                transferId,
                resellerId: req.reseller._id,
            });

            let vehicles = [];
            transfer?.vehicleType?.forEach((vehTy) => {
                if (transferMarkup) {
                    const vehicle = transferMarkup?.vehicleType?.find(
                        (a) => a?.vehicleId?.toString() === vehTy?.vehicle?._id?.toString()
                    );

                    if (vehicle) {
                        vehicles.push({
                            vehicleId: vehTy?.vehicle?._id,
                            vehicleName: vehTy?.vehicle?.name,
                            markupType: vehicle?.markupType || "flat",
                            markup: vehicle?.markup || 0,
                        });
                    } else {
                        vehicles.push({
                            vehicleId: vehTy?.vehicle?._id,
                            vehicleName: vehTy?.vehicle?.name,
                            markupType: "flat",
                            markup: 0,
                        });
                    }
                } else {
                    vehicles.push({
                        vehicleId: vehTy?.vehicle?._id,
                        vehicleName: vehTy?.vehicle?.name,
                        markupType: "flat",
                        markup: 0,
                    });
                }
            });

            res.status(200).json(vehicles);
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },
};
