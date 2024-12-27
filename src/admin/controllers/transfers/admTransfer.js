const { Types, ObjectId } = require("mongoose");
const { sendErrorResponse } = require("../../../helpers");
const { Transfer, Airport, GroupArea, VehicleType } = require("../../../models");
const { Area, City } = require("../../../models/global");

module.exports = {
    getAllTransfers: async (req, res) => {
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

            // let filters2 = {};

            // if (transferTo && transferTo !== "" && transferType === "area-area") {
            //     if (transferTo && transferTo !== "") {
            //         filters2["tansferFromDetails.areas"] = Types.ObjectId(transferTo);
            //     }

            //     if (transferFrom && transferFrom !== "") {
            //         filters2["tansferToDetails.areas"] = Types.ObjectId(transferTo);
            //     }

            //     filters2.transferType = "group-group";
            // }

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

            const transfers = await Transfer.aggregate(pipeline);

            if (transferType === "area-area") {
                transfers[0].data = transfers[0]?.data?.filter((tf) => {
                    if (transferFrom && transferTo) {
                        return tf?.transferFromDetails?.areas?.some(
                            (gpArea) =>
                                gpArea?.toString() === transferFrom?.toString() &&
                                tf?.transferToDetails?.areas?.some(
                                    (gpArea) => gpArea?.toString() === transferTo?.toString()
                                )
                        );
                    } else if (transferFrom) {
                        return tf?.transferFromDetails?.areas?.some(
                            (gpArea) => gpArea?.toString() === transferFrom?.toString()
                        );
                    } else if (transferTo) {
                        return tf?.transferToDetails?.areas?.some(
                            (gpArea) => gpArea?.toString() === transferTo?.toString()
                        );
                    }
                    return true; // If neither transferFrom nor transferTo is provided
                });
                transfers[0].totalTransfer = transfers[0]?.data?.length || 0;
            }

            res.status(200).json({
                transfers: transfers[0]?.data || [],
                total: transfers[0]?.totalTransfer || 0,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    addNewTransfer: async (req, res) => {
        try {
            const {
                transferTo,
                transferFromDatas,
                transferFrom,
                transferToDatas,
                transferType,
                sharedPrice,
                vehicles,
            } = req.body;

            if (transferType === "group-airport") {
                for (let i = 0; i < transferFromDatas.length; i++) {
                    let transferFrom = transferFromDatas[i];
                    let transferFromDetail, transferToDetail;

                    transferFromDetail = await GroupArea.findById(transferFrom);
                    transferToDetail = await Airport.findById(transferTo);

                    if (!transferFromDetail || !transferToDetail) {
                        return sendErrorResponse(res, 400, "Invalid transfer details");
                    }

                    const transfer = await Transfer.findOneAndUpdate(
                        { transferFrom, transferTo },
                        {
                            $set: {
                                transferFrom,
                                transferTo,
                                transferType,
                                sharedPrice: transferType === "group-group" ? sharedPrice : null,
                                vehicleType: vehicles,
                            },
                        },
                        { upsert: true, new: true } // Merge the options into a single object
                    );
                }
            }
            if (transferType === "airport-group") {
                for (let i = 0; i < transferToDatas.length; i++) {
                    let transferTo = transferToDatas[i];
                    let transferFromDetail, transferToDetail;

                    transferFromDetail = await Airport.findById(transferFrom);
                    transferToDetail = await GroupArea.findById(transferTo);

                    if (!transferFromDetail || !transferToDetail) {
                        return sendErrorResponse(res, 400, "Invalid transfer details");
                    }

                    const transfer = await Transfer.findOneAndUpdate(
                        { transferFrom, transferTo },
                        {
                            $set: {
                                transferFrom,
                                transferTo,
                                transferType,
                                sharedPrice: transferType === "group-group" ? sharedPrice : null,
                                vehicleType: vehicles,
                            },
                        },
                        { upsert: true, new: true } // Merge the options into a single object
                    );
                }
            }
            if (transferType === "group-group") {
                for (let i = 0; i < transferToDatas.length; i++) {
                    for (let j = 0; j < transferFromDatas.length; j++) {
                        let transferTo = transferToDatas[i];
                        let transferFrom = transferFromDatas[j];

                        let transferFromDetail, transferToDetail;

                        if (transferType === "group-group") {
                            transferFromDetail = await GroupArea.findById(transferFrom);
                            transferToDetail = await GroupArea.findById(transferTo);
                        }
                        if (!transferFromDetail || !transferToDetail) {
                            return sendErrorResponse(res, 400, "Invalid transfer details");
                        }

                        const transfer = await Transfer.findOneAndUpdate(
                            { transferFrom, transferTo },
                            {
                                // $set: {
                                transferFrom,
                                transferTo,
                                transferType,
                                sharedPrice: transferType === "group-group" ? sharedPrice : null,
                                vehicleType: vehicles,
                                // },
                            },
                            { upsert: true, new: true } // Merge the options into a single object
                        );
                    }
                }
            }
            res.status(200).json({
                message: "New Transfer successfully created",
            });
        } catch (err) {
            console.log(err, "err");
            sendErrorResponse(res, 500, err);
        }
    },

    getAllPlacesAndAirports: async (req, res) => {
        try {
            const groups = await GroupArea.find({ isDeleted: false });
            const airports = await Airport.find({ isDeleted: false });

            res.status(200).json({ groups, airports });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteTransfer: async (req, res) => {
        try {
            const { id } = req.params;

            const transfer = await Transfer.findOneAndDelete({
                _id: id,
            });
            if (!transfer) {
                return sendErrorResponse(res, 404, "Transfer not found");
            }

            res.status(200).json({ message: "Transfer successfully deleted" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleTransfer: async (req, res) => {
        try {
            const { id } = req.params;

            const transfer = await Transfer.findById(id);
            if (!transfer) {
                return sendErrorResponse(res, 404, "Transfer not found");
            }

            res.status(200).json(transfer);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateTransfer: async (req, res) => {
        try {
            const { id } = req.params;

            const { transferFrom, transferTo, sharedPrice, vehicles, transferType } = req.body;

            let transferFromDetail, transferToDetail;

            let transfer;

            if (transferType === "group-group") {
                transferFromDetail = await GroupArea.findById(transferFrom);
                transferToDetail = await GroupArea.findById(transferTo);
            } else if (transferType === "group-airport") {
                transferFromDetail = await GroupArea.findById(transferFrom);
                transferToDetail = await Airport.findById(transferTo);
            } else if (transferType === "airport-group") {
                transferFromDetail = await Airport.findById(transferFrom);
                transferToDetail = await GroupArea.findById(transferTo);
            }

            if (!transferFromDetail || !transferToDetail) {
                return sendErrorResponse(res, 400, "Invalid transfer details");
            }

            const transferChange = await Transfer.findByIdAndUpdate(
                id,
                { transferFrom, transferTo, sharedPrice, vehicleType: vehicles },
                { runValidators: true }
            );

            if (!transferChange) {
                return sendErrorResponse(res, 500, "Transfer not found");
            }

            res.status(200).json({ message: "Transfer updated successfully" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
    getAllVehicles: async (req, res) => {
        try {
            const vehicleTypes = await VehicleType.find({ isDeleted: false });

            if (!vehicleTypes) {
                return sendErrorResponse(res, 400, "vehicle types not found");
            }

            res.status(200).json(vehicleTypes);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
