const { isValidObjectId, Types } = require("mongoose");

const {
    B2bHotelOrder,
    B2BHotelOrderRefund,
    B2BHotelOrderCancellation,
    B2BHotelOrderPayment,
} = require("../../../b2b/models/hotel");
const { sendErrorResponse } = require("../../../helpers");
const { B2BWallet, B2BTransaction } = require("../../../b2b/models");
const {
    cancellationConfirmationEmailToReseller,
    hotelOrderConfirmationEmail,
} = require("../../../b2b/helpers/hotel/email");
const { cancelHotelBedBooking } = require("../../../b2b/helpers/hotel/hotelBedAvailabilityHelpers");
const { createHotelVoucher } = require("../../../b2b/helpers/hotel/hotelVoucherHelpers");
const {
    hotelOrderConfirmSchema,
    hotelOrderCancelSchema,
    hotelOrderCancellationRequestApproveSchema,
} = require("../../validations/hotel/hotelOrders.schema");
const { checkWalletBalance, addMoneyToB2bWallet } = require("../../../b2b/utils/wallet");

module.exports = {
    getAllB2bHotelOrders: async (req, res) => {
        try {
            const {
                skip = 0,
                limit = 10,
                referenceNumber,
                hotelBookingId,
                agentCode,
                supplier,
                checkInDate,
                checkOutDate,
                orderedDateFrom,
                orderedDateTo,
                hotel,
                status,
            } = req.query;

            const filters1 = {};
            const filters2 = {};

            if (referenceNumber && referenceNumber !== "") {
                filters1.referenceNumber = referenceNumber;
            }

            if (hotelBookingId && hotelBookingId !== "") {
                filters1.hotelBookingId = hotelBookingId;
            }

            if (supplier && supplier !== "") {
                filters1.supplier = supplier;
            }

            if (status && status !== "") {
                filters1.status = status;
            }

            if (checkInDate && checkInDate !== "") {
                filters1["fromDate"] = new Date(checkInDate);
            }

            if (checkOutDate && checkOutDate !== "") {
                filters1["toDate"] = new Date(checkOutDate);
            }

            if (
                orderedDateFrom &&
                orderedDateFrom !== "" &&
                orderedDateTo &&
                orderedDateTo !== ""
            ) {
                filters1.$and = [
                    { createdAt: { $gte: new Date(orderedDateFrom) } },
                    { createdAt: { $lte: new Date(orderedDateTo) } },
                ];
            } else if (orderedDateFrom && orderedDateFrom !== "") {
                filters1["createdAt"] = { $gte: new Date(orderedDateFrom) };
            } else if (orderedDateTo && orderedDateTo !== "") {
                filters1["createdAt"] = { $lte: new Date(orderedDateTo) };
            }

            if (agentCode && agentCode !== "") {
                filters2["reseller.agentCode"] = agentCode;
            }

            if (hotel && hotel !== "") {
                if (isValidObjectId(hotel)) {
                    filters2["hotel._id"] = Types.ObjectId(hotel);
                } else {
                    filters2["hotel.hotelName"] = {
                        $regex: hotel,
                        $options: "i",
                    };
                }
            }

            const hotelOrders = await B2bHotelOrder.aggregate([
                {
                    $match: filters1,
                },
                {
                    $lookup: {
                        from: "hotels",
                        localField: "hotel",
                        foreignField: "_id",
                        as: "hotel",
                        pipeline: [
                            {
                                $project: {
                                    hotelName: 1,
                                    address: 1,
                                    image: { $arrayElemAt: ["$images", 0] },
                                },
                            },
                        ],
                    },
                },
                {
                    $lookup: {
                        from: "resellers",
                        localField: "reseller",
                        foreignField: "_id",
                        as: "reseller",
                        pipeline: [{ $project: { agentCode: 1, companyName: 1, name: 1 } }],
                    },
                },
                {
                    $set: {
                        hotel: { $arrayElemAt: ["$hotel", 0] },
                        reseller: { $arrayElemAt: ["$reseller", 0] },
                    },
                },
                { $match: filters2 },
                { $sort: { createdAt: -1 } },
                {
                    $project: {
                        referenceNumber: 1,
                        createdAt: 1,
                        _id: 1,
                        hotel: 1,
                        reseller: 1,
                        fromDate: 1,
                        toDate: 1,
                        totalAdults: 1,
                        totalChildren: 1,
                        netPrice: 1,
                        status: 1,
                        cancellationPolicies: 1,
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalHotelOrders: { $sum: 1 },
                        data: { $push: "$$ROOT" },
                    },
                },
                {
                    $project: {
                        totalHotelOrders: 1,
                        data: {
                            $slice: ["$data", Number(limit) * Number(skip), Number(limit)],
                        },
                    },
                },
            ]);

            res.status(200).json({
                skip: Number(skip),
                limit: Number(limit),
                hotelOrders: hotelOrders[0],
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleB2bOrder: async (req, res) => {
        try {
            const { orderId } = req.params;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            const hotelOrder = await B2bHotelOrder.findOne({ _id: orderId })
                .populate("hotel", "hotelName address images")
                .populate("reseller", "agentCode companyName email name")
                .populate("contactDetails.country", "countryName phonecode")
                .populate("roomType", "roomName")
                .populate("boardType", "boardName boardShortName")
                .populate("basePlan", "boardName boardShortName")
                .populate("extraMealSupplement", "boardName boardShortName")
                .populate("addOnSupplements", "addOnName")
                .populate("contracts.contract", "rateCode rateName")
                .populate("appliedMealUpgrades.promotion", "promotionCode name")
                .populate("appliedRoomTypeUpgrades.promotion", "promotionCode name")
                .populate("appliedStayPays.promotion", "promotionCode name")
                .populate("appliedDiscounts.promotion", "promotionCode name")
                .lean();

            if (!hotelOrder) {
                return sendErrorResponse(res, 404, "hotel order not found");
            }

            const payments = await B2BHotelOrderPayment.find({ orderId })
                .sort({ createdAt: -1 })
                .lean();
            const cancellations = await B2BHotelOrderCancellation.find({ orderId })
                .populate("adminId", "name")
                .sort({ createdAt: -1 })
                .lean();
            const refunds = await B2BHotelOrderRefund.find({ orderId })
                .sort({ createdAt: -1 })
                .lean();

            res.status(200).json({ hotelOrder, payments, cancellations, refunds });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    confirmB2bHotelOrder: async (req, res) => {
        try {
            const { orderId } = req.params;
            const { hotelBookingId } = req.body;

            const { error } = hotelOrderConfirmSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            const hotelOrder = await B2bHotelOrder.findOne({
                _id: orderId,
            })
                .select("_id status")
                .lean();
            if (!hotelOrder) {
                return sendErrorResponse(res, 404, "hotel order not found");
            }

            if (hotelOrder.status !== "booked") {
                return sendErrorResponse(res, 400, "this order already cancelled or confirmed");
            }

            if (hotelOrder?.isApiConnected === true) {
                return sendErrorResponse(res, 400, "sorry, this order can't confirm mannually");
            }

            const updatedHotelOrder = await B2bHotelOrder.findByIdAndUpdate(
                orderId,
                {
                    status: "confirmed",
                    hotelBookingId,
                    lastStatusChange: new Date(),
                },
                { new: true }
            );

            hotelOrderConfirmationEmail({ orderId });

            res.status(200).json({
                message: "hotel order successfully confirmed",
                _id: orderId,
                lastStatusChange: updatedHotelOrder?.lastStatusChange,
                hotelBookingId: updatedHotelOrder?.hotelBookingId,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    cancelB2bHotelOrder: async (req, res) => {
        try {
            const { orderId } = req.params;
            const { cancellationCharge, cancellationRemark } = req.body;

            const { error } = hotelOrderCancelSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 500, error.details[0].message);
            }

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }
            const hotelOrder = await B2bHotelOrder.findOne({
                _id: orderId,
            }).populate("reseller", "name email");
            if (!hotelOrder) {
                return sendErrorResponse(res, 404, "hotel order not found");
            }

            if (hotelOrder.status === "cancelled") {
                return sendErrorResponse(res, 400, "sorry, this order is already cancelled.");
            }

            if (hotelOrder.status !== "booked" && hotelOrder.status !== "confirmed") {
                return sendErrorResponse(res, 400, "Sorry, You can't cancel this order");
            }

            // if (new Date(hotelOrder.fromDate) <= new Date(new Date().setHours(0, 0, 0, 0))) {
            //     return sendErrorResponse(res, 400, "sorry, order cancellation time ended");
            // }

            if (Number(cancellationCharge) > hotelOrder.netPrice) {
                return sendErrorResponse(res, 400, "cancellation charge is greater than net price");
            }

            let prevOrderCancellation = await B2BHotelOrderCancellation.findOne({
                orderId,
                $or: [
                    { cancellationStatus: "pending", cancelledBy: "b2b" },
                    { cancellationStatus: "success" },
                ],
            });
            if (prevOrderCancellation) {
                return sendErrorResponse(
                    res,
                    400,
                    "sorry, there is already a pending or approved cancellation request."
                );
            }

            let orderCancellation = await B2BHotelOrderCancellation.create({
                cancellationProvider: hotelOrder.isApiConnected === true ? "hotel-beds" : "tctt",
                cancellationRemark,
                cancellationStatus: "pending",
                orderId,
                resellerId: hotelOrder?.reseller?._id,
                cancelledBy: "admin",
            });

            let refundAmount = 0;
            if (hotelOrder?.isApiConnected === true) {
                if (hotelOrder?.status === "confirmed") {
                    const response = await cancelHotelBedBooking({
                        bookingReference: hotelOrder.hotelBookingId,
                    });
                    orderCancellation.cancellationStatus = "success";
                    orderCancellation.cancellationChargeHotelBed =
                        response?.hotel?.cancellationAmount;

                    let tempCancellationCharge = 0;
                    if (response?.hotel?.cancellationAmount > Number(cancellationCharge)) {
                        tempCancellationCharge = response?.hotel?.cancellationAmount;
                    } else {
                        tempCancellationCharge = Number(cancellationCharge);
                    }
                    orderCancellation.cancellationCharge = tempCancellationCharge;

                    orderCancellation.adminId = req.admin?._id;
                    hotelOrder.status = "cancelled";
                    await orderCancellation.save();
                    await hotelOrder.save();

                    refundAmount = hotelOrder.netPrice - tempCancellationCharge;
                } else {
                    orderCancellation.cancellationStatus = "failed";
                    await orderCancellation.save();

                    return sendErrorResponse(res, 400, "Sorry, You can't cancel this order");
                }
            } else {
                orderCancellation.cancellationStatus = "success";
                orderCancellation.cancellationCharge = cancellationCharge;
                orderCancellation.adminId = req.admin?._id;
                hotelOrder.status = "cancelled";
                await orderCancellation.save();
                await hotelOrder.save();

                refundAmount = hotelOrder.netPrice - Number(cancellationCharge);
            }

            if (refundAmount > 0) {
                const hotelOrderRefund = await B2BHotelOrderRefund.create({
                    amount: refundAmount,
                    note: "Hotel order cancelled by admin",
                    orderId,
                    paymentMethod: "wallet",
                    resellerId: hotelOrder?.reseller,
                    status: "pending",
                });

                let wallet = await B2BWallet.findOne({
                    reseller: hotelOrder.reseller,
                });
                if (!wallet) {
                    wallet = new B2BWallet({
                        balance: refundAmount,
                        reseller: hotelOrder.reseller,
                    });
                    await wallet.save();
                } else {
                    wallet.balance += refundAmount;
                    await wallet.save();
                }

                hotelOrderRefund.status = "success";
                await hotelOrderRefund.save();
                await B2BTransaction.create({
                    reseller: hotelOrder.reseller,
                    paymentProcessor: "wallet",
                    product: "hotel",
                    processId: hotelOrder?._id,
                    description: `Hotel cancellation refund`,
                    debitAmount: 0,
                    creditAmount: refundAmount,
                    directAmount: 0,
                    closingBalance: wallet.balance,
                    dueAmount: wallet.creditUsed,
                    remark: "Hotel cancellation refund",
                    dateTime: new Date(),
                });
            }

            cancellationConfirmationEmailToReseller({
                email: hotelOrder?.reseller?.email,
                name: hotelOrder?.reseller?.name,
                referenceNumber: hotelOrder?.referenceNumber,
            });

            res.status(200).json({
                message: "hotel order successfully cancelled",
                _id: orderId,
                status: hotelOrder.status,
                orderCancellation,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    approveHotelOrderCancellationRequest: async (req, res) => {
        try {
            const { cancellationId } = req.params;
            const { cancellationCharge } = req.body;

            const { error } = hotelOrderCancellationRequestApproveSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(cancellationId)) {
                return sendErrorResponse(res, 400, "invalid cancellation request id");
            }
            let orderCancellation = await B2BHotelOrderCancellation.findById(cancellationId);
            if (!orderCancellation) {
                return sendErrorResponse(res, 404, "cancellation request is not found");
            }

            if (orderCancellation.cancellationStatus !== "pending") {
                return sendErrorResponse(
                    res,
                    404,
                    "cancellation request is already completed or failed"
                );
            }

            const hotelOrder = await B2bHotelOrder.findOne({
                _id: orderCancellation.orderId,
                reseller: orderCancellation.resellerId,
            }).populate("reseller", "name email");
            if (!hotelOrder) {
                return sendErrorResponse(res, 404, "hotel order not found");
            }

            if (hotelOrder.status === "cancelled") {
                return sendErrorResponse(res, 400, "sorry, this order is already cancelled.");
            }

            if (hotelOrder.status !== "booked" && hotelOrder.status !== "confirmed") {
                return sendErrorResponse(res, 400, "Sorry, You can't cancel this order");
            }

            // if (new Date(hotelOrder.fromDate) <= new Date(new Date().setHours(0, 0, 0, 0))) {
            //     return sendErrorResponse(res, 400, "sorry, order cancellation time ended");
            // }

            if (Number(cancellationCharge) > hotelOrder.netPrice) {
                return sendErrorResponse(res, 400, "cancellation charge is greater than net price");
            }

            if (
                hotelOrder.paymentState !== "fully-paid" &&
                Number(cancellationCharge) !== hotelOrder?.netPrice
            ) {
                return sendErrorResponse(
                    res,
                    400,
                    "this order is not fully paid, so cancellation charge should be equal to net price."
                );
            }

            let refundAmount = 0;
            if (hotelOrder?.isApiConnected === true) {
                if (hotelOrder?.status === "confirmed") {
                    const response = await cancelHotelBedBooking({
                        bookingReference: hotelOrder.hotelBookingId,
                    });
                    orderCancellation.cancellationStatus = "success";
                    orderCancellation.cancellationChargeHotelBed =
                        response?.hotel?.cancellationAmount;

                    let tempCancellationCharge = 0;
                    if (response?.hotel?.cancellationAmount > Number(cancellationCharge)) {
                        tempCancellationCharge = response?.hotel?.cancellationAmount;
                    } else {
                        tempCancellationCharge = Number(cancellationCharge);
                    }
                    orderCancellation.cancellationCharge = tempCancellationCharge;

                    orderCancellation.adminId = req.admin?._id;
                    hotelOrder.status = "cancelled";
                    await orderCancellation.save();
                    await hotelOrder.save();

                    refundAmount = hotelOrder.netPrice - tempCancellationCharge;
                } else {
                    orderCancellation.cancellationStatus = "failed";
                    await orderCancellation.save();

                    return sendErrorResponse(res, 400, "Sorry, You can't cancel this order");
                }
            } else {
                orderCancellation.cancellationStatus = "success";
                orderCancellation.cancellationCharge = cancellationCharge;
                orderCancellation.adminId = req.admin?._id;
                hotelOrder.status = "cancelled";
                await orderCancellation.save();
                await hotelOrder.save();

                refundAmount = hotelOrder.netPrice - Number(cancellationCharge);
            }

            if (refundAmount > 0) {
                const hotelOrderRefund = await B2BHotelOrderRefund.create({
                    amount: refundAmount,
                    note: "Hotel order cancelled by admin",
                    orderId: orderCancellation?.orderId,
                    paymentMethod: "wallet",
                    resellerId: hotelOrder?.reseller,
                    status: "pending",
                });

                let wallet = await B2BWallet.findOne({
                    reseller: hotelOrder.reseller,
                });
                if (!wallet) {
                    wallet = new B2BWallet({
                        balance: refundAmount,
                        reseller: hotelOrder.reseller,
                    });
                    await wallet.save();
                } else {
                    await addMoneyToB2bWallet(wallet, refundAmount);
                }

                hotelOrderRefund.status = "success";
                await hotelOrderRefund.save();
                await B2BTransaction.create({
                    reseller: hotelOrder.reseller,
                    paymentProcessor: "wallet",
                    product: "hotel",
                    processId: hotelOrder?._id,
                    description: `Hotel cancellation refund`,
                    debitAmount: 0,
                    creditAmount: refundAmount,
                    directAmount: 0,
                    closingBalance: wallet.balance,
                    dueAmount: wallet.creditUsed,
                    remark: "Hotel cancellation refund",
                    dateTime: new Date(),
                });
            }

            cancellationConfirmationEmailToReseller({
                email: hotelOrder?.reseller?.email,
                name: hotelOrder?.reseller?.name,
                referenceNumber: hotelOrder?.referenceNumber,
            });

            res.status(200).json({
                message: "hotel order successfully cancelled",
                _id: orderCancellation?.orderId,
                status: hotelOrder.status,
                orderCancellation,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    downloadB2bHotelOrderVoucher: async (req, res) => {
        try {
            const { orderId } = req.params;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid hotel order id");
            }
            const hotelOrder = await B2bHotelOrder.findOne({
                _id: orderId,
            })
                .populate({
                    path: "hotel",
                    populate: {
                        path: "country state city accommodationType hotelContact",
                    },
                })
                .populate("roomType")
                .populate("boardType")
                .populate("contactDetails.country")
                .lean();
            if (!hotelOrder) {
                return sendErrorResponse(res, 404, "hotel order not found");
            }

            if (hotelOrder.status !== "confirmed") {
                return sendErrorResponse(res, 400, "sorry, hotel order not confirmed");
            }

            const pdfBuffer = await createHotelVoucher({ hotelOrder });

            res.set({
                "Content-Type": "application/pdf",
                "Content-Disposition": "attachment; filename=voucher.pdf",
            });
            res.send(pdfBuffer);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getHotelExpiringPayLaterOrders: async (req, res) => {
        try {
            const { skip = 0, limit = 10 } = req.query;

            const expiringHotelPayLaterOrders = await B2bHotelOrder.find({
                paymentState: { $ne: "fully-paid" },
                $or: [{ status: "booked" }, { status: "confirmed" }],
                lastDateForPayment: {
                    $gte: new Date(new Date().setDate(new Date().getDate() - 1)),
                },
            })
                .sort({ lastDateForPayment: 1 })
                .limit(limit)
                .skip(limit * skip)
                .populate({
                    path: "hotel",
                    select: {
                        hotelName: 1,
                        address: 1,
                        image: { $arrayElemAt: ["$images", 0] },
                    },
                })
                .populate("reseller", "agentCode companyName name")
                .select(
                    "hotel reseller referenceNumber createdAt _id fromDate toDate totalAdults totalChildren netPrice status roomsCount paymentState lastDateForPayment"
                )
                .lean();

            const totalOrders = await B2bHotelOrder.find({
                paymentState: { $ne: "fully-paid" },
                $or: [{ status: "booked" }, { status: "confirmed" }],
                lastDateForPayment: {
                    $gte: new Date(new Date().setDate(new Date().getDate() - 1)),
                },
            }).count();

            res.status(200).json({
                totalOrders,
                skip: Number(skip),
                limit: Number(limit),
                expiringHotelPayLaterOrders,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getHotelOrderCancellationRequests: async (req, res) => {
        try {
            const { skip = 0, limit = 10 } = req.query;

            const cancellationRequests = await B2BHotelOrderCancellation.find({
                cancellationStatus: "pending",
                cancelledBy: "b2b",
            })
                .sort({ createdAt: -1 })
                .limit(5)
                .populate({
                    path: "orderId",
                    populate: {
                        path: "hotel",
                        select: {
                            hotelName: 1,
                            address: 1,
                            image: { $arrayElemAt: ["$images", 0] },
                        },
                    },
                    select: {
                        hotel: 1,
                        _id: 1,
                        createdAt: 1,
                        referenceNumber: 1,
                        fromDate: 1,
                        toDate: 1,
                        roomsCount: 1,
                        totalAdults: 1,
                        totalChildren: 1,
                        netPrice: 1,
                        status: 1,
                    },
                })
                .populate("resellerId", "companyName agentCode")
                .lean();

            const totalCancellationRequests = await B2BHotelOrderCancellation.find({
                cancellationStatus: "pending",
                cancelledBy: "b2b",
            }).count();

            res.status(200).json({
                totalCancellationRequests,
                skip: Number(skip),
                limit: Number(limit),
                cancellationRequests,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getHotelOrderTopHotelsList: async (req, res) => {
        try {
            const { skip = 0, limit = 10 } = req.query;

            const topHotelsList = await B2bHotelOrder.aggregate([
                {
                    $match: {
                        status: "confirmed",
                        paymentState: "fully-paid",
                    },
                },
                {
                    $group: {
                        _id: "$hotel",
                        totalOrders: { $sum: 1 },
                        totalVolume: { $sum: "$netPrice" },
                    },
                },
                {
                    $lookup: {
                        from: "hotels",
                        localField: "_id",
                        foreignField: "_id",
                        as: "hotel",
                        pipeline: [
                            {
                                $project: {
                                    hotelName: 1,
                                    address: 1,
                                    image: { $arrayElemAt: ["$images", 0] },
                                },
                            },
                        ],
                    },
                },
                {
                    $set: {
                        hotel: {
                            $arrayElemAt: ["$hotel", 0],
                        },
                    },
                },
                { $sort: { totalOrders: -1 } },
                {
                    $group: {
                        _id: null,
                        totalHotels: { $sum: 1 },
                        data: { $push: "$$ROOT" },
                    },
                },
                {
                    $project: {
                        totalHotels: 1,
                        data: {
                            $slice: ["$data", Number(limit) * Number(skip), Number(limit)],
                        },
                    },
                },
            ]);

            res.status(200).json({
                totalHotels: topHotelsList[0]?.totalHotels,
                skip: Number(skip),
                limit: Number(limit),
                topHotels: topHotelsList[0]?.data || [],
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getHotelOrderTopResellers: async (req, res) => {
        try {
            const { skip = 0, limit = 10 } = req.query;

            const topResellersList = await B2bHotelOrder.aggregate([
                {
                    $match: {
                        status: "confirmed",
                        paymentState: "fully-paid",
                    },
                },
                {
                    $group: {
                        _id: "$reseller",
                        totalOrders: { $sum: 1 },
                        totalVolume: { $sum: "$netPrice" },
                    },
                },
                {
                    $lookup: {
                        from: "resellers",
                        localField: "_id",
                        foreignField: "_id",
                        as: "reseller",
                        pipeline: [
                            {
                                $project: {
                                    agentCode: 1,
                                    companyName: 1,
                                    name: 1,
                                    companyLogo: 1,
                                },
                            },
                        ],
                    },
                },
                {
                    $set: {
                        reseller: {
                            $arrayElemAt: ["$reseller", 0],
                        },
                    },
                },
                { $sort: { totalOrders: -1 } },
                {
                    $group: {
                        _id: null,
                        totalResellers: { $sum: 1 },
                        data: { $push: "$$ROOT" },
                    },
                },
                {
                    $project: {
                        totalResellers: 1,
                        data: {
                            $slice: ["$data", Number(limit) * Number(skip), Number(limit)],
                        },
                    },
                },
            ]);

            res.status(200).json({
                totalResellers: topResellersList[0]?.totalResellers,
                skip: Number(skip),
                limit: Number(limit),
                topResellers: topResellersList[0]?.data || [],
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
