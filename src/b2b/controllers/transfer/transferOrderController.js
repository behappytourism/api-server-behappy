const { sendErrorResponse } = require("../../../helpers");
const { Transfer } = require("../../../models/transfer");
const { b2bTransferOrderSchema } = require("../../validations/transfer/b2bTransfer.schema");
const { State, City, Area } = require("../../../models/global");
const { Attraction, Airport, GroupArea, HomeSettings } = require("../../../models");
const { saveCustomCache, getSavedCache } = require("../../../config/cache");
const {
    B2BTransferOrder,
    B2BWallet,
    B2BTransaction,
    B2BTransferOrderPayment,
    B2BMarkupProfile,
    B2BOrder,
    B2BTransferOrderCancellation,
} = require("../../models");
const { generateUniqueString, ccavenueFormHandler } = require("../../../utils");
const { checkWalletBalance, deductAmountFromWallet } = require("../../utils/wallet");
const sendInsufficentBalanceMail = require("../../helpers/sendInsufficentBalanceEmail");
const sendWalletDeductMail = require("../../helpers/sendWalletDeductMail");
const { Hotel } = require("../../../models/hotel");
const { isValidObjectId, Types } = require("mongoose");
const nodeCCAvenue = require("node-ccavenue");
const createB2bTransferOrderInvoice = require("../../helpers/transfer/createTransferOrderInvoice");
const { MarketStrategy } = require("../../../admin/models");
const createTransferTicketPdf = require("../../helpers/transfer/b2bTransferOrderTicketHelper");
const ccav = new nodeCCAvenue.Configure({
    merchant_id: process.env.CCAVENUE_MERCHANT_ID,
    working_key: process.env.CCAVENUE_WORKING_KEY,
});

module.exports = {
    createTransferBooking: async (req, res) => {
        try {
            const { country, name, email, phoneNumber, journeys, paymentMethod } = req.body;

            const { error } = b2bTransferOrderSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            let journeyArray = [];
            let totalBaseFare = 0;

            for (let i = 0; i < journeys.length; i++) {
                let {
                    transferType,
                    pickupSuggestionType,
                    pickupLocation,
                    dropOffSuggestionType,
                    dropOffLocation,
                    pickupDate,
                    pickupTime,
                    returnDate,
                    returnTime,
                    noOfAdults,
                    noOfChildrens,
                    selectedVehicleTypes,
                    selectedReturnVehicleTypes,
                } = journeys[i];

                let transferFromId;
                let transferToId;
                let transferFrom;
                let transferTo;
                let trips = [];
                let netPrice = 0;
                let netCost = 0;
                let profit = 0;
                let profileMarkup = 0;
                let marketMark = 0;
                let subAgentMarkup = 0;
                let resellerMarkup = 0;

                if (pickupSuggestionType === "AREA") {
                    transferFrom = await Area.findOne({ _id: pickupLocation }).lean();
                    if (!transferFrom) {
                        return sendErrorResponse(res, 400, "area not found");
                    }

                    let transferFromGroup = await GroupArea.findOne({
                        isDeleted: false,
                        areas: { $in: [transferFrom?._id] },
                    });

                    if (!transferFromGroup) {
                        return sendErrorResponse(res, 400, "area not found in group");
                    }

                    transferFrom.name = transferFrom?.areaName;

                    transferFromId = transferFromGroup._id;
                } else if (pickupSuggestionType === "HOTEL") {
                    let hotel = await Hotel.findOne({ _id: pickupLocation });
                    if (!hotel) {
                        return sendErrorResponse(res, 400, "hotel not found");
                    }

                    transferFrom = await Area.findOne({ _id: hotel?.area }).lean();
                    if (!transferFrom) {
                        return sendErrorResponse(res, 400, "hotel area not found");
                    }

                    transferFrom.name = hotel?.hotelName;

                    let transferFromGroup = await GroupArea.findOne({
                        isDeleted: false,
                        areas: { $in: [transferFrom?._id] },
                    });

                    if (!transferFromGroup) {
                        return sendErrorResponse(res, 400, "area not found in group");
                    }

                    transferFromId = transferFromGroup._id;
                } else if (pickupSuggestionType === "ATTRACTION") {
                    let attraction = await Attraction.findOne({ _id: pickupLocation });
                    if (!attraction) {
                        return sendErrorResponse(res, 400, "attraction not found");
                    }

                    transferFrom = await Area.findOne({ _id: attraction?.area }).lean();
                    if (!transferFrom) {
                        return sendErrorResponse(res, 400, "attraction area not found");
                    }

                    transferFrom.name = attraction?.title;

                    let transferFromGroup = await GroupArea.findOne({
                        isDeleted: false,
                        areas: { $in: [transferFrom?._id] },
                    });

                    if (!transferFromGroup) {
                        return sendErrorResponse(res, 400, "area not found in group");
                    }

                    transferFromId = transferFromGroup._id;
                } else if (pickupSuggestionType === "AIRPORT") {
                    transferFromId = pickupLocation;
                    transferFrom = await Airport.findOne({ _id: pickupLocation }).select(
                        "airportName place"
                    );
                } else {
                    return sendErrorResponse(res, 400, "suggestion  found in group");
                }

                if (dropOffSuggestionType === "AREA") {
                    transferTo = await Area.findOne({ _id: dropOffLocation }).lean();
                    if (!transferTo) {
                        return sendErrorResponse(res, 400, "area not found");
                    }

                    let transferToGroup = await GroupArea.findOne({
                        isDeleted: false,
                        areas: { $in: [transferTo?._id] },
                    });

                    if (!transferToGroup) {
                        return sendErrorResponse(res, 400, "area not found in group");
                    }

                    transferTo.name = transferTo?.areaName;

                    transferToId = transferToGroup._id;
                } else if (dropOffSuggestionType === "HOTEL") {
                    let hotel = await Hotel.findOne({ _id: dropOffLocation }).select(
                        "hotelName area"
                    );
                    if (!hotel) {
                        return sendErrorResponse(res, 400, "hotel not found");
                    }

                    transferTo = await Area.findOne({ _id: hotel?.area }).lean();
                    if (!transferTo) {
                        return sendErrorResponse(res, 400, "hotel area not found");
                    }

                    let transferToGroup = await GroupArea.findOne({
                        isDeleted: false,
                        areas: { $in: [transferTo?._id] },
                    });

                    if (!transferToGroup) {
                        return sendErrorResponse(res, 400, "area not found in group");
                    }

                    transferTo.name = hotel?.hotelName;

                    transferToId = transferToGroup._id;
                } else if (dropOffSuggestionType === "ATTRACTION") {
                    let attraction = await Attraction.findOne({ _id: dropOffLocation });

                    transferTo = await Area.findOne({ _id: attraction?.area }).lean();
                    if (!transferTo) {
                        return sendErrorResponse(res, 400, "attraction area not found");
                    }

                    let transferToGroup = await GroupArea.findOne({
                        isDeleted: false,
                        areas: { $in: [transferTo?._id] },
                    });

                    if (!transferToGroup) {
                        return sendErrorResponse(res, 400, "area not found in group");
                    }

                    transferTo.name = attraction?.title;

                    transferToId = transferToGroup._id;
                } else if (dropOffSuggestionType === "AIRPORT") {
                    transferToId = dropOffLocation;
                    transferTo = await Airport.findOne({ _id: dropOffLocation }).select(
                        "airportName place"
                    );
                } else {
                    return sendErrorResponse(res, 400, "suggestion  found in group");
                }

                const transfers = await Transfer.findOne({
                    transferFrom: transferFromId,
                    transferTo: transferToId,
                })
                    .populate({
                        path: "vehicleType.vehicle",
                        populate: {
                            path: "vehicleCategoryId",
                        },
                    })
                    .lean();

                if (!transfers) {
                    return sendErrorResponse(res, 400, "transfer not found for this combination ");
                }

                let vehicleTypes = [];

                let tripPrice = 0;

                for (let k = 0; k < selectedVehicleTypes.length; k++) {
                    let vehicle = transfers?.vehicleType?.find(
                        (vehicleTy) =>
                            vehicleTy?.vehicle?._id?.toString() ===
                            selectedVehicleTypes[k]?.vehicle?.toString()
                    );

                    if (!vehicle) {
                        return sendErrorResponse(
                            res,
                            400,
                            "vehcile not found for this combination "
                        );
                    }

                    vehicleTypes.push({
                        vehicleId: vehicle?.vehicle?._id,
                        name: vehicle?.vehicle?.name,
                        price: vehicle?.price,
                        count: selectedVehicleTypes[k]?.count,
                        occupancy:
                            pickupSuggestionType === "AIRPORT" ||
                            dropOffSuggestionType === "AIRPORT"
                                ? vehicle.vehicle.airportOccupancy
                                : pickupSuggestionType === "HOTEL" &&
                                  dropOffSuggestionType !== "HOTEL"
                                ? vehicle.vehicle.airportOccupancy
                                : vehicle.vehicle.normalOccupancy,
                    });

                    tripPrice += vehicle?.price * selectedVehicleTypes[k]?.count;
                    netCost += vehicle?.price * selectedVehicleTypes[k]?.count;
                    profit += vehicle?.price * selectedVehicleTypes[k]?.count;
                }

                trips.push({
                    transfer: transfers?.transferType,
                    suggestionType: `${pickupSuggestionType}-${dropOffSuggestionType}`,
                    transferFrom,
                    transferTo,
                    pickupDate,
                    pickupTime,
                    vehicleTypes: vehicleTypes,
                    tripPrice,
                });

                if (transferType === "return") {
                    let pickupData = new Date(pickupDate + " " + pickupTime);
                    let returnData = new Date(returnDate + " " + returnTime);

                    let localDateString = returnData.toLocaleString();
                    if (returnData < pickupData) {
                        return sendErrorResponse(
                            res,
                            400,
                            "return date should be after pickupDate "
                        );
                    }
                    console.log(localDateString);
                    let transferFromId;
                    let transferToId;
                    let transferFrom;
                    let transferTo;

                    if (dropOffSuggestionType === "AREA") {
                        transferFrom = await Area.findOne({ _id: dropOffLocation }).lean();
                        if (!transferFrom) {
                            return sendErrorResponse(res, 400, "area not found");
                        }

                        let transferFromGroup = await GroupArea.findOne({
                            isDeleted: false,
                            areas: { $in: [transferFrom?._id] },
                        });

                        if (!transferFromGroup) {
                            return sendErrorResponse(res, 400, "area not found in group");
                        }

                        transferFrom.name = transferFrom?.areaName;

                        transferFromId = transferFromGroup._id;
                    } else if (dropOffSuggestionType === "HOTEL") {
                        let hotel = await Hotel.findOne({ _id: dropOffLocation });
                        if (!hotel) {
                            return sendErrorResponse(res, 400, "hotel not found");
                        }

                        transferFrom = await Area.findOne({ _id: hotel?.area }).lean();
                        if (!transferFrom) {
                            return sendErrorResponse(res, 400, "area not found");
                        }

                        transferFrom.name = hotel?.hotelName;

                        let transferFromGroup = await GroupArea.findOne({
                            isDeleted: false,
                            areas: { $in: [transferFrom?._id] },
                        });

                        if (!transferFromGroup) {
                            return sendErrorResponse(res, 400, "area not found in group");
                        }

                        transferFromId = transferFromGroup._id;
                    } else if (dropOffSuggestionType === "ATTRACTION") {
                        let attraction = await Attraction.findOne({ _id: dropOffLocation });

                        if (!attraction) {
                            return sendErrorResponse(res, 400, "hotel not found");
                        }

                        transferFrom = await Area.findOne({ _id: attraction?.area }).lean();
                        if (!transferFrom) {
                            return sendErrorResponse(res, 400, "area not found");
                        }

                        transferFrom.name = attraction?.title;

                        let transferFromGroup = await GroupArea.findOne({
                            isDeleted: false,
                            areas: { $in: [transferFrom?._id] },
                        });

                        if (!transferFrom) {
                            return sendErrorResponse(res, 400, "hotel area not found");
                        }

                        if (!transferFromGroup) {
                            return sendErrorResponse(res, 400, "area not found in group");
                        }

                        transferFromId = transferFromGroup._id;
                    } else if (dropOffSuggestionType === "AIRPORT") {
                        transferFromId = dropOffLocation;
                        transferFrom = await Airport.findOne({ _id: dropOffLocation }).select(
                            "airportName place"
                        );
                    } else {
                        return sendErrorResponse(res, 400, "suggestion  found in group");
                    }

                    if (pickupSuggestionType === "AREA") {
                        transferTo = await Area.findOne({ _id: pickupLocation }).lean();
                        if (!transferTo) {
                            return sendErrorResponse(res, 400, "area not found");
                        }

                        let transferToGroup = await GroupArea.findOne({
                            isDeleted: false,
                            areas: { $in: [transferTo?._id] },
                        });

                        if (!transferToGroup) {
                            return sendErrorResponse(res, 400, "area not found in group");
                        }

                        transferTo.name = transferTo?.areaName;

                        transferToId = transferToGroup._id;
                    } else if (pickupSuggestionType === "HOTEL") {
                        let hotel = await Hotel.findOne({ _id: pickupLocation });
                        if (!hotel) {
                            return sendErrorResponse(res, 400, "hotel not found");
                        }

                        transferTo = await Area.findOne({ _id: hotel?.area }).lean();
                        if (!transferTo) {
                            return sendErrorResponse(res, 400, "hotel area not found");
                        }

                        let transferToGroup = await GroupArea.findOne({
                            isDeleted: false,
                            areas: { $in: [transferTo?._id] },
                        });

                        if (!transferToGroup) {
                            return sendErrorResponse(res, 400, "area not found in group");
                        }

                        transferTo.name = hotel?.hotelName;

                        transferToId = transferToGroup._id;
                    } else if (pickupSuggestionType === "ATTRACTION") {
                        let attraction = await Attraction.findOne({ _id: pickupLocation });
                        if (!attraction) {
                            return sendErrorResponse(res, 400, "attraction area not found");
                        }
                        transferTo = await Area.findOne({ _id: attraction?.area }).lean();
                        if (!transferTo) {
                            return sendErrorResponse(res, 400, "attraction area not found");
                        }
                        let transferToGroup = await GroupArea.findOne({
                            isDeleted: false,
                            areas: { $in: [transferTo?._id] },
                        });

                        if (!transferToGroup) {
                            return sendErrorResponse(res, 400, "area not found in group");
                        }

                        transferTo.name = attraction?.title;

                        transferToId = transferToGroup._id;
                    } else if (pickupSuggestionType === "AIRPORT") {
                        transferToId = pickupLocation;
                        transferTo = await Airport.findOne({ _id: pickupLocation }).select(
                            "airportName place"
                        );
                    } else {
                        return sendErrorResponse(res, 400, "suggestion  found in group");
                    }

                    const transfers = await Transfer.findOne({
                        transferFrom: transferFromId,
                        transferTo: transferToId,
                    })
                        .populate({
                            path: "vehicleType.vehicle",
                            populate: {
                                path: "vehicleCategoryId",
                            },
                        })
                        .lean();

                    if (!transfers) {
                        return sendErrorResponse(
                            res,
                            400,
                            "transfer not found for this combination "
                        );
                    }

                    let vehicleTypes = [];

                    let tripPrice = 0;

                    for (let k = 0; k < selectedReturnVehicleTypes.length; k++) {
                        let vehicle = transfers?.vehicleType?.find(
                            (vehicleTy) =>
                                vehicleTy?.vehicle?._id.toString() ===
                                selectedReturnVehicleTypes[k]?.vehicle?.toString()
                        );

                        if (!vehicle) {
                            return sendErrorResponse(
                                res,
                                400,
                                "vehcile not found for this combination "
                            );
                        }

                        vehicleTypes.push({
                            vehicleId: vehicle?.vehicle?._id,
                            name: vehicle?.vehicle?.name,
                            price: vehicle?.price,
                            count: selectedReturnVehicleTypes[k]?.count,
                            occupancy:
                                pickupSuggestionType === "AIRPORT" ||
                                dropOffSuggestionType === "AIRPORT"
                                    ? vehicle?.vehicle?.airportOccupancy
                                    : pickupSuggestionType === "HOTEL" &&
                                      dropOffSuggestionType !== "HOTEL"
                                    ? vehicle?.vehicle?.airportOccupancy
                                    : vehicle?.vehicle?.normalOccupancy,
                        });

                        baseFare += vehicle?.price * selectedReturnVehicleTypes[k]?.count;
                        tripPrice += vehicle?.price * selectedReturnVehicleTypes[k]?.count;
                    }

                    trips.push({
                        transfer: transfers?.transferType,
                        suggestionType: `${dropOffSuggestionType}-${pickupSuggestionType}`,
                        transferFrom,
                        transferTo,
                        pickupDate: returnDate,
                        pickupTime: returnTime,
                        vehicleTypes,
                        tripPrice,
                    });
                }

                journeyArray.push({
                    noOfAdults: noOfAdults,
                    noOfChildrens: noOfChildrens,
                    totalPassengers: noOfChildrens + noOfAdults,
                    transferType,
                    trips,
                    baseFare,
                });
                totalBaseFare += baseFare;
            }

            const transferOrder = new B2BTransferOrder({
                reseller: req.reseller._id,
                country,
                name,
                email,
                phoneNumber,
                journey: journeyArray,
                netFare: totalBaseFare,
                baseFare: totalBaseFare,
                profit: 0,
                paymentState: "non-paid",
                status: "pending",
                otp: 12345,
                referenceNumber: generateUniqueString("B2BTRF"),
            });
            await transferOrder.save();

            if (paymentMethod === "ccavenue") {
                // TODO:
                // create a better solution to handle allocations
                // in this approch there is a chance to book single allocation twice or more.

                const transferOrderPayment = await B2BTransferOrderPayment.create({
                    amount: totalBaseFare,
                    orderId: transferOrder?._id,
                    paymentState: "pending",
                    resellerId: req.reseller?._id,
                    paymentMethod: "ccavenue",
                    paymentStateMessage: "",
                });
                return ccavenueFormHandler({
                    res,
                    totalAmount: totalBaseFare,
                    redirectUrl: `${process.env.SERVER_URL}/api/v1/b2b/transfer/order/ccavenue/capture`,
                    cancelUrl: `${process.env.SERVER_URL}/api/v1/b2b/transfer/order/ccavenue/capture`,
                    orderId: transferOrderPayment?._id,
                });
            }

            res.status(200).json({
                message: "transfer order has been initated",
                transferOrderId: transferOrder._id,
                payableAmount: transferOrder?.netFare,
            });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    completeTransferOrder: async (req, res) => {
        try {
            const { otp, orderId } = req.body;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "Invalid order id");
            }

            const transferOrder = await B2BTransferOrder.findOne({
                _id: orderId,
                reseller: req.reseller._id,
            });

            if (!transferOrder) {
                return sendErrorResponse(res, 400, "transfer order not found");
            }

            if (transferOrder?.status === "completed") {
                return sendErrorResponse(res, 400, "sorry, you have already completed this order!");
            }

            if (!transferOrder.otp || transferOrder.otp !== Number(otp)) {
                return sendErrorResponse(res, 400, "incorrect otp!");
            }

            let totalAmount = transferOrder.netFare;

            let wallet = await B2BWallet.findOne({
                reseller: req.reseller?._id,
            });

            const balanceAvailable = checkWalletBalance(wallet, totalAmount);
            if (!balanceAvailable) {
                let reseller = req.reseller;
                sendInsufficentBalanceMail(reseller);
                throw Error("insufficient balance. please reacharge and try again");
            }

            const transferOrderPayment = await B2BTransferOrderPayment.create({
                amount: totalAmount,
                orderId: transferOrder?._id,
                paymentState: "pending",
                resellerId: req.reseller?._id,
                paymentMethod: "ccavenue",
                paymentStateMessage: "",
            });

            try {
                await deductAmountFromWallet(wallet, totalAmount);
            } catch (err) {
                transferOrderPayment.paymentState = "failed";
                await transferOrderPayment.save();

                return sendErrorResponse(res, 400, "wallet deduction failed, please try again");
            }

            transferOrderPayment.paymentState = "success";
            await transferOrderPayment.save();

            await B2BTransaction.create({
                reseller: req.reseller?._id,
                paymentProcessor: "wallet",
                product: "transfer",
                processId: orderId,
                description: `Transfer booking payment`,
                debitAmount: totalAmount,
                creditAmount: 0,
                directAmount: 0,
                closingBalance: wallet.balance,
                dueAmount: wallet.creditUsed,
                remark: "Transfer booking payment",
                dateTime: new Date(),
            });

            let reseller = req.reseller;
            sendWalletDeductMail(reseller, transferOrder, totalAmount);

            transferOrder.paymentState = "fully-paid";
            transferOrder.status = "completed";
            await transferOrder.save();

            res.status(200).json({
                message: "order successfully placed",
                referenceNumber: transferOrder.referenceNumber,
                _id: transferOrder?._id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    completeTransferOrderWithCcAvenue: async (req, res) => {
        try {
            const { encResp } = req.body;

            const decryptedJsonResponse = ccav.redirectResponseToJson(encResp);
            const { order_id, order_status } = decryptedJsonResponse;

            const transferOrderPayment = await B2BTransferOrderPayment.findById(order_id);
            if (!transferOrderPayment) {
                return sendErrorResponse(
                    res,
                    400,
                    "Transfer order payment not found!. Please check with our team if amount is debited from your bank!"
                );
            }

            const transferOrder = await B2BTransferOrder.findOne({
                _id: transferOrderPayment.orderId,
            });
            if (!transferOrder) {
                return sendErrorResponse(res, 400, "Transfer  order  not found!");
            }

            if (transferOrder?.status === "completed") {
                return sendErrorResponse(res, 400, "sorry, you have already completed this order!");
            }

            // if (new Date(b2bHotelOrder.expiresIn).getTime() < new Date().getTime()) {
            //     return sendErrorResponse(
            //         res,
            //         400,
            //         "your order is expired, please create a new order. Please check with our team if amount is debited from your bank!"
            //     );
            // }

            let wallet = await B2BWallet.findOne({ reseller: transferOrder?.reseller });
            if (!wallet) {
                wallet = await B2BWallet.create({
                    balance: 0,
                    creditAmount: 0,
                    creditUsed: 0,
                    reseller: transferOrder?.reseller,
                });
            }

            if (order_status !== "Success") {
                transferOrderPayment.status = "failed";
                await transferOrderPayment.save();

                res.writeHead(301, {
                    Location: `${process.env.B2B_WEB_URL}/transfer/invoice/error`,
                });
                res.end();
            } else {
                transferOrderPayment.status = "success";
                await transferOrderPayment.save();

                await B2BTransaction.create({
                    reseller: transferOrder?.reseller,
                    paymentProcessor: "ccavenue",
                    product: "hotel",
                    processId: transferOrder?._id,
                    description: `Hotel order payment`,
                    debitAmount: 0,
                    creditAmount: 0,
                    directAmount: transferOrder?.netFare,
                    closingBalance: wallet.balance,
                    dueAmount: wallet.creditUsed,
                    remark: "Transfer order payment",
                    dateTime: new Date(),
                });

                transferOrder.paymentState = "fully-paid";
                transferOrder.status = "completed";
                await transferOrder.save();

                res.writeHead(301, {
                    Location: `${process.env.B2B_WEB_URL}/transfer/invoice/${transferOrder?._id}`,
                });
                res.end();
            }
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllTransferOrders: async (req, res) => {
        try {
            const { skip = 0, limit = 10, search, dateFrom, dateTo } = req.query;

            const filter = { reseller: req.reseller._id };

            if (search && search !== "") {
                filter.$or = [{ referenceNumber: { $regex: search, $options: "i" } }];
            }

            if (dateFrom && dateFrom !== "" && dateTo && dateTo !== "") {
                filter.$and = [
                    { createdAt: { $gte: new Date(dateFrom) } },
                    { createdAt: { $lte: new Date(dateTo) } },
                ];
            } else if (dateFrom && dateFrom !== "") {
                filter["createdAt"] = {
                    $gte: new Date(dateFrom),
                };
            } else if (dateTo && dateTo !== "") {
                filter["createdAt"] = { $lte: new Date(dateTo) };
            }

            const transferOrders = await B2BTransferOrder.find(filter)
                .populate("trips.vehicleTypes.vehicleId")
                .select({
                    baseFare: 0,
                    profit: 0,
                })
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalTransfers = await B2BTransferOrder.find(filter).count();

            res.status(200).json({
                transferOrders,
                totalTransfers,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleTransfer: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid transfer id");
            }
            const transferOrders = await B2BTransferOrder.findById(id).select({
                baseFare: 0,
                profit: 0,
            });
            if (!transferOrders) {
                return sendErrorResponse(res, 400, "No transfer order found ");
            }

            res.status(200).json(transferOrders);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    downloadTransferOrderInvoice: async (req, res) => {
        try {
            const { orderId } = req.params;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid hotel order id");
            }

            const hotelOrder = await B2BTransferOrder.findOne({
                _id: orderId,
                // reseller: req.reseller?._id,
            })
                .select("_id status")
                .lean();
            if (!hotelOrder) {
                return sendErrorResponse(res, 404, "transfer order not found");
            }

            if (hotelOrder.status === "pending") {
                return sendErrorResponse(res, 400, "sorry, transfer order not completed");
            }

            const pdfBuffer = await createB2bTransferOrderInvoice({
                orderId,
                resellerId: req.reseller?._id,
            });

            res.set({
                "Content-Type": "application/pdf",
                "Content-Disposition": "attachment; filename=invoice.pdf",
            });
            res.send(pdfBuffer);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    downloadTransferTicket: async (req, res) => {
        try {
            const { orderId } = req.params;
            console.log(orderId);
            const b2bOrder = await B2BOrder.findOne({
                _id: orderId,
                status: "completed",
            }).populate("transferId");

            if (!b2bOrder?.transferId) {
                return sendErrorResponse(
                    res,
                    400,
                    "Transfer order status not completed!. Please check with our team if amount is debited from your bank!"
                );
            }
            const pdfBuffer = await createTransferTicketPdf(b2bOrder);

            res.set({
                "Content-Type": "application/pdf",

                "Content-Disposition": "attachment; filename=tickets.pdf",
            });
            res.send(pdfBuffer);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    cancelB2bTransferOrder: async (req, res) => {
        try {
            const { orderId, transferId } = req.params;
            const { cancellationRemark } = req.body;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }
            const transferOrder = await B2BTransferOrder.findOne({
                _id: orderId,
                // reseller: req.reseller?._id,
            }).populate("reseller", "_id role name email referredBy");

            if (!transferOrder) {
                return sendErrorResponse(res, 404, "order details not found");
            }

            const orderDetail = transferOrder.journey.find((joun) => {
                return joun._id.toString() === transferId.toString();
            });

            if (!orderDetail) {
                return sendErrorResponse(res, 404, "activity  not found");
            }

            if (orderDetail.status === "cancelled") {
                return sendErrorResponse(res, 400, "sorry, this order is already cancelled.");
            }

            if (orderDetail.status !== "booked" && orderDetail.status !== "confirmed") {
                return sendErrorResponse(res, 400, "sorry, this order can't cancel right now.");
            }

            let orderCancellation = await B2BTransferOrderCancellation.findOne({
                orderId,
                transferId,
                resellerId: transferOrder.reseller?._id,
                $or: [{ cancellationStatus: "pending" }, { cancellationStatus: "success" }],
            });
            if (orderCancellation) {
                if (orderCancellation.cancellationStatus === "pending") {
                    return sendErrorResponse(
                        res,
                        400,
                        "sorry, this order already submitted cancellation request."
                    );
                } else if (orderCancellation.cancellationStatus === "success") {
                    return sendErrorResponse(res, 400, "sorry, this order is already cancelled.");
                }
            } else {
                orderCancellation = await B2BTransferOrderCancellation.create({
                    cancellationRemark,
                    cancellationStatus: "pending",
                    orderId,
                    resellerId: transferOrder.reseller?._id,
                    cancelledBy: "b2b",
                    transferId,
                });
            }

            await orderCancellation.save();

            res.status(200).json({
                message: "order cancellation request successfully submitted.",
                status: orderDetail.status,
                cancelledBy: orderCancellation.cancelledBy,
                cancellationRemark: orderCancellation.cancellationRemark,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
