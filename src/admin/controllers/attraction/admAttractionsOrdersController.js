const { isValidObjectId, Types } = require("mongoose");
const xl = require("excel4node");
const moment = require("moment");

const {
    B2BAttractionOrder,
    B2BWallet,
    B2BTransaction,
    B2BAttractionOrderCancellation,
} = require("../../../b2b/models");
const { sendErrorResponse } = require("../../../helpers");
const {
    AttractionOrder,
    Driver,
    AttractionTicketSetting,
    B2CAttractionOrderPayment,
    B2CAttractionOrderCancellation,
    B2CAttractionOrderRefund,
    B2CTransaction,
} = require("../../../models");
const { getB2bOrders, generateB2bOrdersSheet } = require("../../../b2b/helpers/b2bOrdersHelper");
const sendOrderConfirmationEmail = require("../../helpers/sendOrderConfirmationMail");
const sendOrderCancellationEmail = require("../../helpers/sendOrderCancellationEmail");
const { formatDate } = require("../../../utils");
const {
    B2BAttractionOrderPayment,
    B2BAttractionOrderRefund,
} = require("../../../b2b/models/attraction");
const createMultipleTicketPdf = require("../../../b2b/helpers/multipleTicketHelper");
const createMultipleTicketPdfTheme2 = require("../../../b2b/helpers/attraction/createMultipleTicketTheme2");
const createBookingTicketPdf = require("../../../b2b/helpers/bookingTicketsHelper");
const createBookingTicketPdfTheme2 = require("../../../b2b/helpers/attraction/styles/createBookingTicketPdfTheme2");
const createBookingPdfTheme3 = require("../../../b2b/helpers/attraction/styles/createBookingPdfTheme3");
const createMultipleTicketPdfTheme3 = require("../../../b2b/helpers/attraction/createMultipleTicketTheme3");
const b2bAttractionOrderInvoice = require("../../../b2b/helpers/attraction/b2bAttractionOrderInvoice");
const { activityCancellationHelper } = require("../../helpers/attraction/attractionOrderHelper");
const { addMoneyToB2bWallet } = require("../../../b2b/utils/wallet");

module.exports = {
    getAllB2cOrders: async (req, res) => {
        try {
            const {
                skip = 0,
                limit = 10,
                bookingType,
                status,
                referenceNo,
                dateFrom,
                dateTo,
                attraction,
                activity,
                travellerEmail,
                userId,
            } = req.query;

            const filters1 = {
                "activities.status": {
                    $in: ["booked", "confirmed", "cancelled", "pending"],
                },
            };
            const filters2 = {};

            if (userId && userId != "") {
                filters1.user = Types.ObjectId(userId);
            }

            if (bookingType && bookingType != "") {
                filters1["activities.bookingType"] = bookingType;
            }

            if (referenceNo && referenceNo !== "") {
                filters1.referenceNumber = referenceNo;
            }

            if (status && status !== "") {
                filters1["activities.status"] = status;
            }

            if (travellerEmail && travellerEmail !== "") {
                filters1.email = travellerEmail;
            }

            if (dateFrom && dateFrom !== "" && dateTo && dateTo !== "") {
                filters1.$and = [
                    { "activities.date": { $gte: new Date(dateFrom) } },
                    { "activities.date": { $lte: new Date(dateTo) } },
                ];
            } else if (dateFrom && dateFrom !== "") {
                filters1["activities.date"] = { $gte: new Date(dateFrom) };
            } else if (dateTo && dateTo !== "") {
                filters1["activities.date"] = { $lte: new Date(dateTo) };
            }

            if (attraction && attraction !== "") {
                if (isValidObjectId(attraction)) {
                    filters2["attraction._id"] = Types.ObjectId(attraction);
                } else {
                    filters2["attraction.title"] = {
                        $regex: attraction,
                        $options: "i",
                    };
                }
            }

            if (activity && activity !== "") {
                if (isValidObjectId(activity)) {
                    filters2["activities.activity._id"] = Types.ObjectId(activity);
                } else {
                    filters2["activities.activity.name"] = {
                        $regex: activity,
                        $options: "i",
                    };
                }
            }

            const orders = await AttractionOrder.aggregate([
                {
                    $unwind: "$activities",
                },
                { $match: filters1 },
                {
                    $lookup: {
                        from: "attractionactivities",
                        localField: "activities.activity",
                        foreignField: "_id",
                        as: "activities.activity",
                    },
                },
                {
                    $lookup: {
                        from: "attractions",
                        localField: "activities.activity.attraction",
                        foreignField: "_id",
                        as: "attraction",
                    },
                },
                {
                    $lookup: {
                        from: "countries",
                        localField: "country",
                        foreignField: "_id",
                        as: "country",
                    },
                },
                {
                    $lookup: {
                        from: "drivers",
                        localField: "activities.driver",
                        foreignField: "_id",
                        as: "activities.driver",
                    },
                },
                {
                    $set: {
                        "activities.activity": {
                            $arrayElemAt: ["$activities.activity", 0],
                        },
                        attraction: {
                            $arrayElemAt: ["$attraction", 0],
                        },
                        country: { $arrayElemAt: ["$country", 0] },
                        "activities.driver": {
                            $arrayElemAt: ["$activities.driver", 0],
                        },
                    },
                },
                { $match: filters2 },
                { $sort: { createdAt: -1 } },
                {
                    $project: {
                        totalOffer: 1,
                        totalAmount: 1,
                        name: 1,
                        email: 1,
                        phoneNumber: 1,
                        country: 1,
                        orderStatus: 1,
                        merchant: 1,
                        paymentStatus: 1,
                        paymentOrderId: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        attraction: {
                            _id: 1,
                            title: 1,
                            images: 1,
                        },
                        activities: {
                            activity: {
                                _id: 1,
                                name: 1,
                                description: 1,
                            },
                            bookingType: 1,
                            date: 1,
                            adultsCount: 1,
                            childrenCount: 1,
                            infantCount: 1,
                            adultCost: 1,
                            childCost: 1,
                            transferType: 1,
                            grandTotal: 1,
                            offerAmount: 1,
                            adultTickets: 1,
                            childTickets: 1,
                            status: 1,
                            isRefunded: 1,
                            profit: 1,
                            bookingConfirmationNumber: 1,
                            driver: 1,
                            _id: 1,
                            note: 1,
                            privateTransfers: 1,
                        },
                        referenceNumber: 1,
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
            ]);

            res.status(200).json({
                result: orders[0],
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllB2cOrdersSheet: async (req, res) => {
        try {
            const {
                skip = 0,
                limit = 10,
                bookingType,
                status,
                referenceNo,
                dateFrom,
                dateTo,
                attraction,
                activity,
                travellerEmail,
            } = req.query;

            const filters1 = {
                "activities.status": {
                    $in: ["booked", "confirmed", "cancelled", "pending"],
                },
            };

            const filters2 = {};

            if (bookingType && bookingType != "") {
                filters1["activities.bookingType"] = bookingType;
            }

            if (referenceNo && referenceNo !== "") {
                filters1.referenceNumber = referenceNo;
            }

            if (status && status !== "") {
                filters1["activities.status"] = status;
            }

            if (travellerEmail && travellerEmail !== "") {
                filters1.email = travellerEmail;
            }

            if (dateFrom && dateFrom !== "" && dateTo && dateTo !== "") {
                filters1.$and = [
                    { "activities.date": { $gte: new Date(dateFrom) } },
                    { "activities.date": { $lte: new Date(dateTo) } },
                ];
            } else if (dateFrom && dateFrom !== "") {
                filters1["activities.date"] = { $gte: new Date(dateFrom) };
            } else if (dateTo && dateTo !== "") {
                filters1["activities.date"] = { $lte: new Date(dateTo) };
            }

            if (attraction && attraction !== "") {
                if (isValidObjectId(attraction)) {
                    filters2["attraction._id"] = Types.ObjectId(attraction);
                } else {
                    filters2["attraction.title"] = {
                        $regex: attraction,
                        $options: "i",
                    };
                }
            }

            if (activity && activity !== "") {
                if (isValidObjectId(activity)) {
                    filters2["activities.activity._id"] = Types.ObjectId(activity);
                } else {
                    filters2["activities.activity.name"] = {
                        $regex: activity,
                        $options: "i",
                    };
                }
            }

            const orders = await AttractionOrder.aggregate([
                {
                    $unwind: "$activities",
                },
                { $match: filters1 },
                {
                    $lookup: {
                        from: "attractionactivities",
                        localField: "activities.activity",
                        foreignField: "_id",
                        as: "activities.activity",
                    },
                },
                {
                    $lookup: {
                        from: "attractions",
                        localField: "activities.activity.attraction",
                        foreignField: "_id",
                        as: "attraction",
                    },
                },
                {
                    $lookup: {
                        from: "countries",
                        localField: "country",
                        foreignField: "_id",
                        as: "country",
                    },
                },
                {
                    $lookup: {
                        from: "drivers",
                        localField: "activities.driver",
                        foreignField: "_id",
                        as: "activities.driver",
                    },
                },
                {
                    $set: {
                        "activities.activity": {
                            $arrayElemAt: ["$activities.activity", 0],
                        },
                        attraction: {
                            $arrayElemAt: ["$attraction", 0],
                        },
                        country: { $arrayElemAt: ["$country", 0] },
                        "activities.driver": {
                            $arrayElemAt: ["$activities.driver", 0],
                        },
                    },
                },
                { $match: filters2 },
                { $sort: { createdAt: -1 } },
                {
                    $project: {
                        totalOffer: 1,
                        totalAmount: 1,
                        name: 1,
                        email: 1,
                        phoneNumber: 1,
                        country: 1,
                        orderStatus: 1,
                        merchant: 1,
                        paymentStatus: 1,
                        paymentOrderId: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        attraction: {
                            title: 1,
                            images: 1,
                        },
                        activities: {
                            activity: {
                                name: 1,
                            },
                            bookingType: 1,
                            date: 1,
                            adultsCount: 1,
                            childrenCount: 1,
                            infantCount: 1,
                            adultCost: 1,
                            childCost: 1,
                            transferType: 1,
                            offerAmount: 1,
                            amount: 1,
                            adultTickets: 1,
                            childTickets: 1,
                            status: 1,
                            isRefunded: 1,
                            profit: 1,
                            bookingConfirmationNumber: 1,
                            driver: 1,
                            _id: 1,
                        },
                        referenceNumber: 1,
                    },
                },
                {
                    $skip: Number(limit) * Number(skip),
                },
                {
                    $limit: Number(limit),
                },
            ]);

            var wb = new xl.Workbook();
            var ws = wb.addWorksheet("Orders");

            const titleStyle = wb.createStyle({
                font: {
                    bold: true,
                },
            });

            ws.cell(1, 1).string("Ref No").style(titleStyle);
            ws.cell(1, 2).string("Activity").style(titleStyle);
            ws.cell(1, 3).string("Purchase Date").style(titleStyle);
            ws.cell(1, 4).string("Booking Date").style(titleStyle);
            ws.cell(1, 5).string("Traveller Name").style(titleStyle);
            ws.cell(1, 6).string("Traveller Email").style(titleStyle);
            ws.cell(1, 7).string("Traveller Country").style(titleStyle);
            ws.cell(1, 8).string("Traveller Phone Number").style(titleStyle);
            ws.cell(1, 9).string("Adults").style(titleStyle);
            ws.cell(1, 10).string("Children").style(titleStyle);
            ws.cell(1, 11).string("Infant").style(titleStyle);
            ws.cell(1, 12).string("Transfer Type").style(titleStyle);
            ws.cell(1, 13).string("Driver").style(titleStyle);
            if (bookingType === "ticket") {
                ws.cell(1, 14).string("Tickets").style(titleStyle);
            } else {
                ws.cell(1, 14).string("Booking Confirmation No").style(titleStyle);
            }
            ws.cell(1, 15).string("Price").style(titleStyle);
            ws.cell(1, 16).string("Profit").style(titleStyle);
            ws.cell(1, 17).string("Status").style(titleStyle);

            for (let i = 0; i < orders.length; i++) {
                const order = orders[i];
                ws.cell(i + 2, 1).string(order?.referenceNumber || "N/A");
                ws.cell(i + 2, 2).string(order?.activities?.activity?.name || "N/A");
                ws.cell(i + 2, 3).string(order?.createdAt ? formatDate(order?.createdAt) : "N/A");
                ws.cell(i + 2, 4).string(
                    order?.activities?.date ? formatDate(order?.activities?.date) : "N/A"
                );
                ws.cell(i + 2, 5).string(order?.name || "N/A");
                ws.cell(i + 2, 6).string(order?.email || "N/A");
                ws.cell(i + 2, 7).string(order?.country?.countryName || "N/A");
                ws.cell(i + 2, 8).string(
                    order?.country?.phonecode + " " + order?.phoneNumber || "N/A"
                );
                ws.cell(i + 2, 9).number(Number(order?.activities?.adultsCount) || 0);
                ws.cell(i + 2, 10).number(Number(order?.activities?.childrenCount) || 0);
                ws.cell(i + 2, 11).number(Number(order?.activities?.infantCount) || 0);
                ws.cell(i + 2, 12).string(order?.activities?.transferType || "N/A");
                ws.cell(i + 2, 13).string(order?.activities?.driver?.name || "N/A");
                if (bookingType === "ticket") {
                    let adultTickets = order?.activities?.adultTickets
                        ? order?.activities?.adultTickets?.map((ticket) => ticket?.ticketNo)
                        : [];
                    let childTickets = order?.activities?.childTickets
                        ? order?.activities?.childTickets?.map((ticket) => ticket?.ticketNo)
                        : [];
                    let infantTickets = order?.activities?.infantTickets
                        ? order?.activities?.infantTickets?.map((ticket) => ticket?.ticketNo)
                        : [];
                    let allTickets = [...adultTickets, ...childTickets, ...infantTickets];
                    ws.cell(i + 2, 14).string(JSON.stringify(allTickets) || "N/A");
                } else {
                    ws.cell(i + 2, 14).string(
                        order?.activities?.bookingConfirmationNumber || "N/A"
                    );
                }
                ws.cell(i + 2, 15).number(Number(order?.activities?.amount) || 0);
                ws.cell(i + 2, 16).number(Number(order?.activities?.profit) || 0);
                ws.cell(i + 2, 17).string(order?.activities?.status || "N/A");
            }

            wb.write(`FileName.xlsx`, res);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllB2bAttractionOrders: async (req, res) => {
        try {
            const {
                referenceNo,
                agentCode,
                orderDateFrom,
                orderDateTo,
                orderStatus,
                traveller,
                skip = 0,
                limit = 10,
            } = req.query;

            const filters1 = { orderStatus: "completed" };
            const filters2 = {};

            if (referenceNo) {
                filters1["referenceNumber"] = referenceNo;
            }

            if (orderStatus) {
                filters1["orderStatus"] = orderStatus;
            }

            if (traveller) {
                filters1.$or = [
                    { email: { $regex: traveller, $options: "i" } },
                    { name: { $regex: traveller, $options: "i" } },
                ];
            }

            if (orderDateFrom && orderDateTo) {
                filters1.$and = [
                    { createdAt: { $gte: moment(orderDateFrom).startOf("day").toDate() } },
                    { createdAt: { $lte: moment(orderDateTo).startOf("day").toDate() } },
                ];
            } else if (orderDateFrom) {
                filters1["createdAt"] = {
                    $gte: moment(orderDateFrom).startOf("day").toDate(),
                };
            } else if (orderDateTo) {
                filters1["createdAt"] = { $lte: moment(orderDateTo).startOf("day").toDate() };
            }

            if (agentCode && agentCode !== "") {
                filters2["reseller.agentCode"] = Number(agentCode);
            }

            const attractionOrders = await B2BAttractionOrder.aggregate([
                { $match: filters1 },
                {
                    $lookup: {
                        from: "resellers",
                        localField: "reseller",
                        foreignField: "_id",
                        as: "reseller",
                        pipeline: [{ $project: { companyName: 1, agentCode: 1 } }],
                    },
                },
                { $match: filters2 },
                {
                    $facet: {
                        totalOrders: [{ $count: "count" }],
                        data: [
                            { $sort: { createdAt: -1 } },
                            { $skip: Number(limit) * Number(skip) },
                            { $limit: Number(limit) },
                            {
                                $lookup: {
                                    from: "countries",
                                    localField: "country",
                                    foreignField: "_id",
                                    as: "country",
                                },
                            },
                            {
                                $set: {
                                    country: { $arrayElemAt: ["$country", 0] },
                                    reseller: { $arrayElemAt: ["$reseller", 0] },
                                },
                            },
                            {
                                $project: {
                                    referenceNumber: 1,
                                    agentReferenceNumber: 1,
                                    orderStatus: 1,
                                    paymentState: 1,
                                    name: 1,
                                    email: 1,
                                    country: 1,
                                    phoneNumber: 1,
                                    totalOffer: 1,
                                    totalAmount: 1,
                                    orderType: 1,
                                    createdAt: 1,
                                    reseller: 1,
                                    activitiesCount: { $size: "$activities" },
                                },
                            },
                        ],
                    },
                },
                {
                    $project: {
                        totalOrders: { $arrayElemAt: ["$totalOrders.count", 0] },
                        data: 1,
                    },
                },
            ]);

            res.status(200).json({
                totalAttractionOrders: attractionOrders[0]?.totalOrders || 0,
                skip: Number(skip),
                limit: Number(limit),
                attractionOrders: attractionOrders[0]?.data || [],
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllB2cAttractionOrders: async (req, res) => {
        try {
            const {
                referenceNo,
                orderDateFrom,
                orderDateTo,
                orderStatus,
                traveller,
                skip = 0,
                limit = 10,
            } = req.query;

            const filters1 = {};

            if (referenceNo) {
                filters1["referenceNumber"] = referenceNo;
            }

            if (orderStatus) {
                filters1["orderStatus"] = orderStatus;
            }

            if (traveller) {
                filters1.$or = [
                    { email: { $regex: traveller, $options: "i" } },
                    { name: { $regex: traveller, $options: "i" } },
                ];
            }

            if (orderDateFrom && orderDateTo) {
                filters1.$and = [
                    { createdAt: { $gte: moment(orderDateFrom).startOf("day").toDate() } },
                    { createdAt: { $lte: moment(orderDateTo).startOf("day").toDate() } },
                ];
            } else if (orderDateFrom) {
                filters1["createdAt"] = {
                    $gte: moment(orderDateFrom).startOf("day").toDate(),
                };
            } else if (orderDateTo) {
                filters1["createdAt"] = { $lte: moment(orderDateTo).startOf("day").toDate() };
            }

            const attractionOrders = await AttractionOrder.aggregate([
                { $match: filters1 },
                { $sort: { createdAt: -1 } },
                {
                    $lookup: {
                        from: "countries",
                        localField: "country",
                        foreignField: "_id",
                        as: "country",
                    },
                },
                {
                    $set: {
                        country: { $arrayElemAt: ["$country", 0] },
                    },
                },
                {
                    $project: {
                        referenceNumber: 1,
                        agentReferenceNumber: 1,
                        orderStatus: 1,
                        paymentState: 1,
                        name: 1,
                        email: 1,
                        country: 1,
                        phoneNumber: 1,
                        totalOffer: 1,
                        totalAmount: 1,
                        orderType: 1,
                        createdAt: 1,
                        activitiesCount: { $size: "$activities" },
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
            ]);

            res.status(200).json({
                totalAttractionOrders: attractionOrders[0]?.totalOrders || 0,
                skip: Number(skip),
                limit: Number(limit),
                attractionOrders: attractionOrders[0]?.data || [],
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleB2bAttractionOrder: async (req, res) => {
        try {
            const { orderId } = req.params;

            const attractionOrder = await B2BAttractionOrder.findById(orderId)
                .populate("reseller", "name companyName agentCode email")
                .populate("country", "phonecode")
                .populate("activities.activity", "name")
                .populate("activities.attraction", "title images")
                .lean();

            const payments = await B2BAttractionOrderPayment.find({ orderId })
                .sort({ createdAt: -1 })
                .lean();

            const cancellations = await B2BAttractionOrderCancellation.find({ orderId })
                .populate("adminId", "name")
                .sort({ createdAt: -1 })
                .lean();

            const refunds = await B2BAttractionOrderRefund.find({ orderId })
                .sort({ createdAt: -1 })
                .lean();

            res.status(200).json({ attractionOrder, payments, cancellations, refunds });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleB2cAttractionOrder: async (req, res) => {
        try {
            const { orderId } = req.params;

            const attractionOrder = await AttractionOrder.findById(orderId)
                .populate("country", "phonecode")
                .populate("activities.activity", "name")
                .populate("activities.attraction", "title images")
                .lean();

            const payments = await B2CAttractionOrderPayment.find({ orderId })
                .sort({ createdAt: -1 })
                .lean();

            const cancellations = await B2CAttractionOrderCancellation.find({ orderId })
                .populate("adminId", "name")
                .sort({ createdAt: -1 })
                .lean();

            const refunds = await B2CAttractionOrderRefund.find({ orderId })
                .sort({ createdAt: -1 })
                .lean();

            res.status(200).json({ attractionOrder, payments, cancellations, refunds });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllB2bOrders: async (req, res) => {
        try {
            const { result, skip, limit } = await getB2bOrders({
                ...req.query,
            });

            res.status(200).json({ result, skip, limit });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    confirmBooking: async (req, res) => {
        try {
            const { orderId, bookingId, bookingConfirmationNumber, note, orderedBy } = req.body;

            console.log(note, "note");

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            if (!isValidObjectId(bookingId)) {
                return sendErrorResponse(res, 400, "invalid booking id");
            }

            let orderDetails;
            if (orderedBy === "b2c") {
                orderDetails = await AttractionOrder.findOne(
                    {
                        _id: orderId,
                    },
                    { activities: { $elemMatch: { _id: bookingId } } }
                );
            } else {
                orderDetails = await B2BAttractionOrder.findOne(
                    {
                        _id: orderId,
                    },
                    { activities: { $elemMatch: { _id: bookingId } } }
                );
            }

            if (!orderDetails || orderDetails?.activities[0]?.length < 1) {
                return sendErrorResponse(res, 400, "Order not found");
            }

            if (orderDetails.activities[0]?.bookingType !== "booking") {
                return sendErrorResponse(res, 400, "Only bookings can confirmed!");
            }

            if (orderDetails.activities[0].status !== "booked") {
                return sendErrorResponse(
                    res,
                    400,
                    "You can't confirm this booking. because this order not booked or cancelled or already confirmed"
                );
            }

            if (orderedBy === "b2c") {
                await AttractionOrder.findOneAndUpdate(
                    {
                        _id: orderId,
                        "activities._id": bookingId,
                    },
                    {
                        "activities.$.status": "confirmed",
                        "activities.$.bookingConfirmationNumber": bookingConfirmationNumber,
                        "activities.$.note": note,
                    },
                    { runValidators: true }
                );
            } else {
                await B2BAttractionOrder.findOneAndUpdate(
                    {
                        _id: orderId,
                        "activities._id": bookingId,
                    },
                    {
                        "activities.$.status": "confirmed",
                        "activities.$.bookingConfirmationNumber": bookingConfirmationNumber,
                        "activities.$.note": note,
                    },
                    { runValidators: true }
                );
            }

            if (orderedBy === "b2c") {
                orderAttraction = await AttractionOrder.findOne(
                    { _id: orderId, "activities._id": bookingId },
                    {
                        "activities.$": 1,
                        referenceNumber: 1,
                        reseller: 1,
                        email: 1,
                        name: 1,
                    }
                ).populate("activities.attraction");

                await sendOrderConfirmationEmail(
                    orderAttraction.email,
                    orderAttraction.name,
                    orderAttraction,
                    bookingConfirmationNumber,
                    note
                );
            } else {
                let orderAttraction = await B2BAttractionOrder.findOne(
                    { _id: orderId, "activities._id": bookingId },
                    { "activities.$": 1, referenceNumber: 1, reseller: 1 }
                ).populate("reseller activities.attraction");

                await sendOrderConfirmationEmail(
                    orderAttraction.reseller.email,
                    orderAttraction.reseller.name,
                    orderAttraction,
                    bookingConfirmationNumber,
                    note
                );
            }

            res.status(200).json({
                message: "Booking confirmed successfully",
                bookingConfirmationNumber,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    // TODO:
    // update cancellation model and transaction model
    cancelBooking: async (req, res) => {
        try {
            const { orderId, bookingId, orderedBy } = req.body;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "Invalid order id");
            }

            if (!isValidObjectId(bookingId)) {
                return sendErrorResponse(res, 400, "Invalid booking id");
            }

            let orderDetails;
            if (orderedBy === "b2c") {
                orderDetails = await AttractionOrder.findOne(
                    {
                        _id: orderId,
                    },
                    {
                        activities: { $elemMatch: { _id: bookingId } },
                    }
                );
            } else {
                orderDetails = await B2BAttractionOrder.findOne(
                    {
                        _id: orderId,
                    },
                    {
                        activities: { $elemMatch: { _id: bookingId } },
                        reseller: 1,
                    }
                );
            }

            if (!orderDetails || orderDetails?.activities?.length < 1) {
                return sendErrorResponse(res, 400, "Order not found");
            }

            if (orderDetails.activities[0]?.bookingType !== "booking") {
                return sendErrorResponse(res, 400, "Only bookings can cancelled!");
            }

            if (orderDetails.activities[0].status !== "booked") {
                return sendErrorResponse(res, 400, "You cantn't canel this booking.");
            }

            if (orderedBy === "b2c") {
                await AttractionOrder.findOneAndUpdate(
                    {
                        _id: orderId,
                        "activities._id": bookingId,
                    },
                    {
                        "activities.$.status": "cancelled",
                        "activities.$.cancelledBy": "admin",
                        "activities.$.cancellationFee": 0,
                        "activities.$.refundAmount": orderDetails.activities[0].grandTotal,
                        "activities.$.isRefundAvailable": true,
                    },
                    { runValidators: true }
                );
            } else {
                await B2BAttractionOrder.findOneAndUpdate(
                    {
                        _id: orderId,
                        "activities._id": bookingId,
                    },
                    {
                        "activities.$.status": "cancelled",
                    },
                    { runValidators: true }
                );
            }

            if (orderedBy === "b2c") {
                orderAttraction = await AttractionOrder.findOne(
                    { _id: orderId, "activities._id": bookingId },
                    {
                        "activities.$": 1,
                        referenceNumber: 1,
                        reseller: 1,
                        email: 1,
                        name: 1,
                    }
                ).populate("activities.attraction");

                await sendOrderCancellationEmail(
                    orderAttraction.email,
                    orderAttraction.name,
                    orderAttraction
                );
            } else {
                let orderAttraction = await B2BAttractionOrder.findOne(
                    { _id: orderId, "activities._id": bookingId },
                    { "activities.$": 1, referenceNumber: 1, reseller: 1 }
                ).populate("reseller activities.attraction");

                await sendOrderCancellationEmail(
                    orderAttraction.reseller.email,
                    orderAttraction.reseller.name,
                    orderAttraction
                );
            }

            res.status(200).json({
                message: "Booking cancelled successfully",
            });
        } catch (err) {
            console.log(err, "eror");
            sendErrorResponse(res, 500, err);
        }
    },

    updateDriverForOrder: async (req, res) => {
        try {
            const { orderId, orderItemId, drivers, orderedBy } = req.body;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "Invalid order id");
            }

            if (!isValidObjectId(orderItemId)) {
                return sendErrorResponse(res, 400, "Invalid order item id");
            }

            if (!drivers || drivers.length < 1) {
                return sendErrorResponse(res, 400, "driver is required");
            }

            let orderDetails;
            if (orderedBy === "b2c") {
                orderDetails = await AttractionOrder.findOne(
                    {
                        _id: orderId,
                    },
                    { activities: { $elemMatch: { _id: orderItemId } } }
                );
            } else {
                orderDetails = await B2BAttractionOrder.findOne(
                    {
                        _id: orderId,
                    },
                    { activities: { $elemMatch: { _id: orderItemId } } }
                );
            }

            if (!orderDetails || orderDetails?.activities?.length < 1) {
                return sendErrorResponse(res, 400, "Order not found");
            }

            if (orderDetails.activities[0].status !== "confirmed") {
                return sendErrorResponse(
                    res,
                    400,
                    "You can only assign driver for confirmed orders"
                );
            }

            if (orderDetails?.activities[0]?.transferType === "without") {
                return sendErrorResponse(res, 400, "Sorry, This order has no transfer");
            }

            let driversRequired = 0;
            if (orderDetails.activities[0]?.transferType === "shared") {
                driversRequired = 1;
            } else if (orderDetails.activities[0]?.transferType === "private") {
                const total = orderDetails.activities[0]?.privateTransfers
                    .map((item) => item.count)
                    .reduce((prev, next) => prev + next);
                driversRequired = total || 0;
            }

            if (driversRequired !== drivers.length) {
                return sendErrorResponse(res, 400, `${driversRequired} drivers should be provided`);
            }

            const driverDetails = await Driver.find({
                _id: drivers,
                isDeleted: false,
            });
            if (!driverDetails || driverDetails.length < 1) {
                return sendErrorResponse(res, 404, "driver not found");
            }

            if (orderedBy === "b2c") {
                await AttractionOrder.findOneAndUpdate(
                    {
                        _id: orderId,
                        "activities._id": orderItemId,
                    },
                    {
                        "activities.$.drivers": drivers,
                    },
                    { runValidators: true }
                );
            } else {
                await B2BAttractionOrder.findOneAndUpdate(
                    {
                        _id: orderId,
                        "activities._id": orderItemId,
                    },
                    {
                        "activities.$.drivers": drivers,
                    },
                    { runValidators: true }
                );
            }

            // send mail here

            res.status(200).json({ driverDetails });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleResellerAttractionOrders: async (req, res) => {
        try {
            const { resellerId } = req.params;

            if (!isValidObjectId(resellerId)) {
                return sendErrorResponse(res, 400, "invalid reseller id");
            }

            const { result, skip, limit } = await getB2bOrders({
                ...req.query,
                resellerId,
            });

            res.status(200).json({ result, skip, limit });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getB2bAllOrdersSheet: async (req, res) => {
        try {
            await generateB2bOrdersSheet({
                ...req.query,
                res,
                downloader: "admin",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleResellerAttractionOrdersSheet: async (req, res) => {
        try {
            const { resellerId } = req.params;

            if (!isValidObjectId(resellerId)) {
                return sendErrorResponse(res, 400, "invalid reseller id");
            }

            await generateB2bOrdersSheet({
                ...req.query,
                res,
                resellerId,
                downloader: "admin",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllOrdersStatistics: async (req, res) => {
        try {
            const { bookingType, fromDate, toDate } = req.query;

            const filters = {};

            if (bookingType && bookingType !== "") {
                filters["activities.bookingType"] = bookingType;
            }

            if (fromDate && toDate) {
                filters.$and = [
                    { createdAt: { $gte: new Date(fromDate) } },
                    { createdAt: { $lte: new Date(toDate) } },
                ];
            } else if (fromDate) {
                filters["createdAt"] = { $gte: new Date(fromDate) };
            } else if (toDate) {
                filters["createdAt"] = { $lte: new Date(toDate) };
            }

            const attractionOrders = await B2BAttractionOrder.aggregate([
                { $match: { orderStatus: "completed" } },
                { $unwind: "$activities" },
                {
                    $match: {
                        "activities.bookingType": "ticket",
                        "activities.status": "confirmed",
                        ...filters,
                    },
                },
                { $unwind: "$activities" },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        volume: { $sum: "$activities.grandTotal" },
                        cost: { $sum: "$activities.totalCost" },
                        profit: { $sum: "$activities.profit" },
                    },
                },
            ]);

            const topSellingResellers = await B2BAttractionOrder.aggregate([
                { $match: { orderStatus: "completed" } },
                { $unwind: "$activities" },
                {
                    $match: {
                        "activities.status": "confirmed",
                        ...filters,
                    },
                },
                {
                    $group: {
                        _id: "$reseller",
                        count: { $sum: 1 },
                        reseller: { $first: "$reseller" },
                        grandTotal: { $sum: "$activities.grandTotal" },
                        totalCost: { $sum: "$activities.totalCost" },
                        profit: { $sum: "$activities.profit" },
                        resellerMarkup: { $sum: "$activities.resellerMarkup" },
                        subAgentMarkup: { $sum: "$activities.subAgentMarkup" },
                    },
                },
                {
                    $sort: {
                        count: -1,
                    },
                },
                { $limit: 10 },
                {
                    $lookup: {
                        from: "resellers",
                        localField: "reseller",
                        foreignField: "_id",
                        as: "reseller",
                        pipeline: [
                            {
                                $project: {
                                    agentCode: 1,
                                    companyName: 1,
                                    role: 1,
                                },
                            },
                        ],
                    },
                },
                {
                    $set: {
                        reseller: { $arrayElemAt: ["$reseller", 0] },
                    },
                },
            ]);

            const topSellingActivities = await B2BAttractionOrder.aggregate([
                { $match: { orderStatus: "completed" } },
                { $unwind: "$activities" },
                {
                    $match: {
                        "activities.status": "confirmed",
                        ...filters,
                    },
                },
                {
                    $group: {
                        _id: "$activities.activity",
                        count: { $sum: 1 },
                        activity: { $first: "$activities.activity" },
                        attraction: { $first: "$activities.attraction" },
                        grandTotal: { $sum: "$activities.grandTotal" },
                        totalCost: { $sum: "$activities.totalCost" },
                        profit: { $sum: "$activities.profit" },
                    },
                },
                {
                    $sort: {
                        count: -1,
                    },
                },
                { $limit: 10 },
                {
                    $lookup: {
                        from: "attractions",
                        localField: "attraction",
                        foreignField: "_id",
                        as: "attraction",
                        pipeline: [
                            {
                                $project: {
                                    title: 1,
                                    images: 1,
                                },
                            },
                        ],
                    },
                },
                {
                    $lookup: {
                        from: "attractionactivities",
                        localField: "activity",
                        foreignField: "_id",
                        as: "activity",
                        pipeline: [
                            {
                                $project: {
                                    name: 1,
                                },
                            },
                        ],
                    },
                },
                {
                    $set: {
                        activity: { $arrayElemAt: ["$activity", 0] },
                        attraction: { $arrayElemAt: ["$attraction", 0] },
                    },
                },
            ]);

            res.status(200).json({
                attractionOrders: attractionOrders[0],
                topSellingActivities,
                topSellingResellers,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    downloadAttractionOrderTickets: async (req, res) => {
        try {
            const { orderId, activityId } = req.params;

            const orderDetails = await B2BAttractionOrder.aggregate([
                {
                    $match: {
                        _id: Types.ObjectId(orderId),
                        $or: [{ orderStatus: "completed" }, { orderStatus: "paid" }],
                        // activities: {
                        //     $elemMatch: { _id: Types.ObjectId(activityId) },
                        // },
                    },
                },
                { $unwind: "$activities" },
                {
                    $match: {
                        "activities._id": Types.ObjectId(activityId),
                    },
                },
                {
                    $lookup: {
                        from: "attractionactivities",
                        localField: "activities.activity",
                        foreignField: "_id",
                        as: "activities.activity",
                    },
                },
                {
                    $lookup: {
                        from: "attractions",
                        localField: "activities.attraction",
                        foreignField: "_id",
                        as: "activities.attraction",
                    },
                },
                {
                    $lookup: {
                        from: "destinations",
                        localField: "activities.attraction.destination",
                        foreignField: "_id",
                        as: "activities.destination",
                    },
                },
                {
                    $set: {
                        "activities.destination": {
                            $arrayElemAt: ["$activities.destination", 0],
                        },
                        "activities.activity": {
                            $arrayElemAt: ["$activities.activity", 0],
                        },
                        "activities.attraction": {
                            $arrayElemAt: ["$activities.attraction", 0],
                        },
                    },
                },
                {
                    $project: {
                        activities: {
                            activity: {
                                name: 1,
                                description: 1,
                                termsAndConditions: 1,
                            },
                            attraction: {
                                title: 1,
                                logo: 1,
                                images: 1,
                                _id: 1,
                            },
                            destination: {
                                name: 1,
                            },
                            _id: 1,
                            voucherNumber: 1,
                            startTime: 1,
                            bookingConfirmationNumber: 1,
                            note: 1,
                            adultTickets: 1,
                            childTickets: 1,
                            infantTickets: 1,
                            status: 1,
                            amount: 1,
                            offerAmount: 1,
                            transferType: 1,
                            adultsCount: 1,
                            childrenCount: 1,
                            infantCount: 1,
                            date: 1,
                            bookingType: 1,
                        },
                        name: 1,
                    },
                },
            ]);

            if (orderDetails.length < 1 || orderDetails?.activities?.length < 1) {
                return sendErrorResponse(res, 400, "order not found");
            }

            const theme = await AttractionTicketSetting.findOne({});

            if (orderDetails[0].activities.bookingType === "booking") {
                // if (orderDetails[0].activities.status != "confirmed") {
                //     return sendErrorResponse(res, 400, "order not confirmed");
                // }

                if (theme.selected.toString() === "theme2") {
                    const pdfBuffer = await createBookingTicketPdfTheme2(
                        orderDetails[0].activities
                    );

                    res.set({
                        "Content-Type": "application/pdf",

                        "Content-Disposition": "attachment; filename=tickets.pdf",
                    });
                    res.send(pdfBuffer);
                } else if (theme.selected.toString() === "theme3") {
                    const pdfBuffer = await createBookingPdfTheme3(
                        orderDetails[0].activities,
                        orderDetails[0].name
                    );

                    res.set({
                        "Content-Type": "application/pdf",

                        "Content-Disposition": "attachment; filename=tickets.pdf",
                    });
                    res.send(pdfBuffer);
                } else {
                    const pdfBuffer = await createBookingTicketPdf(orderDetails[0].activities);

                    res.set({
                        "Content-Type": "application/pdf",

                        "Content-Disposition": "attachment; filename=tickets.pdf",
                    });
                    res.send(pdfBuffer);
                }
            } else {
                if (theme.selected.toString() === "theme2") {
                    const pdfBuffer = await createMultipleTicketPdfTheme2(
                        orderDetails[0].activities
                    );

                    res.set({
                        "Content-Type": "application/pdf",

                        "Content-Disposition": "attachment; filename=tickets.pdf",
                    });
                    res.send(pdfBuffer);
                } else if (theme.selected.toString() === "theme3") {
                    console.log("theme3 selected");
                    const pdfBuffer = await createMultipleTicketPdfTheme3(
                        orderDetails[0].activities,
                        orderDetails[0].name
                    );

                    res.set({
                        "Content-Type": "application/pdf",

                        "Content-Disposition": "attachment; filename=tickets.pdf",
                    });
                    res.send(pdfBuffer);
                } else {
                    const pdfBuffer = await createMultipleTicketPdf(orderDetails[0].activities);

                    res.set({
                        "Content-Type": "application/pdf",

                        "Content-Disposition": "attachment; filename=tickets.pdf",
                    });
                    res.send(pdfBuffer);
                }
            }
        } catch (err) {
            console.log(err, "err");
            sendErrorResponse(res, 500, err);
        }
    },
    downloadAttractionOrderB2cTickets: async (req, res) => {
        try {
            const { orderId, activityId } = req.params;

            const orderDetails = await AttractionOrder.aggregate([
                {
                    $match: {
                        _id: Types.ObjectId(orderId),
                        $or: [{ orderStatus: "completed" }, { orderStatus: "paid" }],
                        // activities: {
                        //     $elemMatch: { _id: Types.ObjectId(activityId) },
                        // },
                    },
                },
                { $unwind: "$activities" },
                {
                    $match: {
                        "activities._id": Types.ObjectId(activityId),
                    },
                },
                {
                    $lookup: {
                        from: "attractionactivities",
                        localField: "activities.activity",
                        foreignField: "_id",
                        as: "activities.activity",
                    },
                },
                {
                    $lookup: {
                        from: "attractions",
                        localField: "activities.attraction",
                        foreignField: "_id",
                        as: "activities.attraction",
                    },
                },
                {
                    $lookup: {
                        from: "destinations",
                        localField: "activities.attraction.destination",
                        foreignField: "_id",
                        as: "activities.destination",
                    },
                },
                {
                    $set: {
                        "activities.destination": {
                            $arrayElemAt: ["$activities.destination", 0],
                        },
                        "activities.activity": {
                            $arrayElemAt: ["$activities.activity", 0],
                        },
                        "activities.attraction": {
                            $arrayElemAt: ["$activities.attraction", 0],
                        },
                    },
                },
                {
                    $project: {
                        activities: {
                            activity: {
                                name: 1,
                                description: 1,
                                termsAndConditions: 1,
                            },
                            attraction: {
                                title: 1,
                                logo: 1,
                                images: 1,
                                _id: 1,
                            },
                            destination: {
                                name: 1,
                            },
                            _id: 1,
                            voucherNumber: 1,
                            startTime: 1,
                            bookingConfirmationNumber: 1,
                            note: 1,
                            adultTickets: 1,
                            childTickets: 1,
                            infantTickets: 1,
                            status: 1,
                            amount: 1,
                            offerAmount: 1,
                            transferType: 1,
                            adultsCount: 1,
                            childrenCount: 1,
                            infantCount: 1,
                            date: 1,
                            bookingType: 1,
                        },
                        name: 1,
                    },
                },
            ]);

            console.log(orderDetails, "orderDetails");
            if (orderDetails.length < 1 || orderDetails?.activities?.length < 1) {
                return sendErrorResponse(res, 400, "order not found");
            }

            const theme = await AttractionTicketSetting.findOne({});

            if (orderDetails[0].activities.bookingType === "booking") {
                // if (orderDetails[0].activities.status != "confirmed") {
                //     return sendErrorResponse(res, 400, "order not confirmed");
                // }

                if (theme.selected.toString() === "theme2") {
                    const pdfBuffer = await createBookingTicketPdfTheme2(
                        orderDetails[0].activities
                    );

                    res.set({
                        "Content-Type": "application/pdf",

                        "Content-Disposition": "attachment; filename=tickets.pdf",
                    });
                    res.send(pdfBuffer);
                } else if (theme.selected.toString() === "theme3") {
                    const pdfBuffer = await createBookingPdfTheme3(
                        orderDetails[0].activities,
                        orderDetails[0].name
                    );

                    res.set({
                        "Content-Type": "application/pdf",

                        "Content-Disposition": "attachment; filename=tickets.pdf",
                    });
                    res.send(pdfBuffer);
                } else {
                    const pdfBuffer = await createBookingTicketPdf(orderDetails[0].activities);

                    res.set({
                        "Content-Type": "application/pdf",

                        "Content-Disposition": "attachment; filename=tickets.pdf",
                    });
                    res.send(pdfBuffer);
                }
            } else {
                if (theme.selected.toString() === "theme2") {
                    const pdfBuffer = await createMultipleTicketPdfTheme2(
                        orderDetails[0].activities
                    );

                    res.set({
                        "Content-Type": "application/pdf",

                        "Content-Disposition": "attachment; filename=tickets.pdf",
                    });
                    res.send(pdfBuffer);
                } else if (theme.selected.toString() === "theme3") {
                    console.log("theme3 selected");
                    const pdfBuffer = await createMultipleTicketPdfTheme3(
                        orderDetails[0].activities,
                        orderDetails[0].name
                    );

                    res.set({
                        "Content-Type": "application/pdf",

                        "Content-Disposition": "attachment; filename=tickets.pdf",
                    });
                    res.send(pdfBuffer);
                } else {
                    const pdfBuffer = await createMultipleTicketPdf(orderDetails[0].activities);

                    res.set({
                        "Content-Type": "application/pdf",

                        "Content-Disposition": "attachment; filename=tickets.pdf",
                    });
                    res.send(pdfBuffer);
                }
            }
        } catch (err) {
            console.log(err, "err");
            sendErrorResponse(res, 500, err);
        }
    },
    generateAttractionInvoicePdf: async (req, res) => {
        try {
            const { orderId } = req.params;

            const pdfBuffer = await b2bAttractionOrderInvoice({
                orderId,
                resellerId: req.reseller?._id,
            });

            res.set({
                "Content-Type": "application/pdf",
                "Content-Disposition": "attachment; filename=tickets.pdf",
            });
            res.send(pdfBuffer);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    attractionActivityB2bCancellation: async (req, res) => {
        try {
            const { orderId, activityId } = req.params;
            const { cancellationCharge, cancellationRemark } = req.body;
            console.log(orderId, activityId, "orderId, activityId ");

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }
            const attractionOrder = await B2BAttractionOrder.findOne({
                _id: orderId,
            })
                .populate("reseller", "name email")
                .populate({
                    path: "activities.attraction",
                    select: "id title isApiConnected",
                })
                .populate({
                    path: "activities.activity",
                    select: "id name ",
                });

            if (!attractionOrder) {
                return sendErrorResponse(res, 404, "attraction order not found");
            }

            const actOrder = attractionOrder.activities.find((activity) => {
                return activity._id.toString() === activityId.toString() && activity;
            });

            if (!actOrder) {
                return sendErrorResponse(res, 404, "activity  not found");
            }

            if (actOrder.status === "cancelled") {
                return sendErrorResponse(res, 400, "sorry, this order is already cancelled.");
            }
            if (actOrder.status !== "booked" && actOrder.status !== "confirmed") {
                return sendErrorResponse(res, 400, "Sorry, You can't cancel this order");
            }

            if (Number(cancellationCharge) > actOrder.netPrice) {
                return sendErrorResponse(res, 400, "cancellation charge is greater than net price");
            }

            let prevOrderCancellation = await B2BAttractionOrderCancellation.findOne({
                orderId,
                activityId: activityId,
                $or: [
                    { cancellationStatus: "pending", cancelledBy: "b2b" },
                    { cancellationStatus: "success" },
                ],
            });

            console.log(prevOrderCancellation, "prevOrderCancellation");

            if (prevOrderCancellation) {
                return sendErrorResponse(
                    res,
                    400,
                    "sorry, there is already a pending request or approved cancellation request."
                );
            }

            let orderCancellation = await B2BAttractionOrderCancellation.create({
                cancellationRemark,
                cancellationStatus: "pending",
                orderId,
                resellerId: attractionOrder?.reseller?._id,
                cancelledBy: "admin",
                activityId,
                activity: actOrder.activity._id,
                activityName: actOrder.activity.name,
            });
            if (actOrder?.attraction?.isApiConnected === true) {
                return sendErrorResponse(res, 400, "Sorry, You can't cancel this order");
            } else {
                await activityCancellationHelper({ activity: actOrder });

                orderCancellation.cancellationStatus = "success";
                orderCancellation.cancellationCharge = cancellationCharge;
                orderCancellation.cancellationRemark = cancellationRemark;
                orderCancellation.adminId = req.admin?._id;
                await orderCancellation.save();
                await B2BAttractionOrder.findOneAndUpdate(
                    {
                        _id: orderId,
                        "activities._id": activityId,
                    },
                    {
                        "activities.$.status": "cancelled",
                        "activities.$.note": cancellationRemark,
                    },
                    { runValidators: true }
                );
                refundAmount = actOrder.grandTotal - Number(cancellationCharge);
            }
            let attOrderRefund;
            if (refundAmount > 0) {
                attOrderRefund = await B2BAttractionOrderRefund.create({
                    amount: refundAmount,
                    note: "Attraction order cancelled by admin",
                    orderId,
                    paymentMethod: "wallet",
                    resellerId: attractionOrder?.reseller,
                    status: "pending",
                    activityId,
                    activity: actOrder.activity._id,
                    activityName: actOrder.activity.name,
                });

                let wallet = await B2BWallet.findOne({
                    reseller: attractionOrder.reseller,
                });
                if (!wallet) {
                    wallet = new B2BWallet({
                        balance: refundAmount,
                        reseller: attractionOrder.reseller,
                    });
                    await wallet.save();
                } else {
                    wallet.balance += refundAmount;
                    await wallet.save();
                }

                attOrderRefund.status = "success";
                await attOrderRefund.save();
                await B2BTransaction.create({
                    reseller: attractionOrder.reseller,
                    paymentProcessor: "wallet",
                    product: "attraction",
                    processId: attractionOrder?._id,
                    description: `Attraction cancellation refund`,
                    debitAmount: 0,
                    creditAmount: refundAmount,
                    directAmount: 0,
                    closingBalance: wallet.balance,
                    dueAmount: wallet.creditUsed,
                    remark: "Attraction cancellation refund",
                    dateTime: new Date(),
                });
            }

            res.status(200).json({
                message: "order cancellation  successfully submitted.",
                status: actOrder.status,
                cancellation: orderCancellation,
                refund: attOrderRefund,
                activityId: orderCancellation.activityId,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    approveAttractionOrderB2bCancellationRequest: async (req, res) => {
        try {
            const { cancellationId } = req.params;
            const { cancellationCharge } = req.body;

            if (!isValidObjectId(cancellationId)) {
                return sendErrorResponse(res, 400, "invalid cancellation id");
            }

            let orderCancellation = await B2BAttractionOrderCancellation.findById(cancellationId);
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
            const attractionOrder = await B2BAttractionOrder.findOne({
                _id: orderCancellation.orderId,
                reseller: orderCancellation.resellerId,
            })
                .populate("reseller", "name email")
                .populate({
                    path: "activities.attraction",
                    select: "id title isApiConnected",
                })
                .populate({
                    path: "activities.activity",
                    select: "id name ",
                });

            if (!attractionOrder) {
                return sendErrorResponse(res, 404, "attraction order not found");
            }

            const actOrder = attractionOrder.activities.find((activity) => {
                return (
                    activity._id.toString() === orderCancellation.activityId.toString() && activity
                );
            });

            if (!actOrder) {
                return sendErrorResponse(res, 404, "activity  not found");
            }

            if (actOrder.status === "cancelled") {
                return sendErrorResponse(res, 400, "sorry, this order is already cancelled.");
            }
            // if (actOrder.status !== "booked" && actOrder.status !== "confirmed") {
            //     return sendErrorResponse(res, 400, "Sorry, You can't cancel this order");
            // }

            if (Number(cancellationCharge) > actOrder?.grandTotal) {
                return sendErrorResponse(res, 400, "cancellation charge is greater than net price");
            }

            if (actOrder?.attraction?.isApiConnected === true) {
                return sendErrorResponse(res, 400, "Sorry, You can't cancel this order");
            } else {
                orderCancellation.cancellationStatus = "success";
                orderCancellation.cancellationCharge = cancellationCharge;
                orderCancellation.adminId = req.admin?._id;
                await activityCancellationHelper({ activity: actOrder });
                await orderCancellation.save();
                await B2BAttractionOrder.findOneAndUpdate(
                    {
                        _id: orderCancellation.orderId,
                        "activities._id": orderCancellation.activityId,
                    },
                    {
                        "activities.$.status": "cancelled",
                        "activities.$.note": orderCancellation?.cancellationRemark,
                    },
                    { runValidators: true }
                );
                refundAmount = Number(actOrder.grandTotal) - Number(cancellationCharge);
            }

            let attOrderRefund;
            if (refundAmount > 0) {
                attOrderRefund = await B2BAttractionOrderRefund.create({
                    amount: refundAmount,
                    note: "Attraction order cancelled by admin",
                    orderId: orderCancellation.orderId,
                    paymentMethod: "wallet",
                    resellerId: attractionOrder?.reseller,
                    status: "pending",
                    activityId: orderCancellation.activityId,
                    activity: actOrder.activity._id,
                    activityName: actOrder.activity.name,
                });

                let wallet = await B2BWallet.findOne({
                    reseller: attractionOrder.reseller,
                });
                if (!wallet) {
                    wallet = new B2BWallet({
                        balance: refundAmount,
                        reseller: attractionOrder.reseller,
                    });
                    await wallet.save();
                } else {
                    await addMoneyToB2bWallet(wallet, refundAmount);
                }

                attOrderRefund.status = "success";
                await attOrderRefund.save();
                await B2BTransaction.create({
                    reseller: attractionOrder.reseller,
                    paymentProcessor: "wallet",
                    product: "attraction",
                    processId: attractionOrder?._id,
                    description: `Attraction cancellation refund`,
                    debitAmount: 0,
                    creditAmount: refundAmount,
                    directAmount: 0,
                    closingBalance: wallet.balance,
                    dueAmount: wallet.creditUsed,
                    remark: "Attraction cancellation refund",
                    dateTime: new Date(),
                });
            } else {
                return sendErrorResponse(
                    res,
                    400,
                    "Sorry, You can't cancel this order refund amount is less"
                );
            }
            res.status(200).json({
                message: "order cancellation  successfully submitted.",
                status: actOrder.status,
                cancellation: orderCancellation,
                refund: attOrderRefund,
                activityId: orderCancellation.activityId,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    attractionActivityB2cCancellation: async (req, res) => {
        try {
            const { orderId, activityId } = req.params;
            const { cancellationCharge, cancellationRemark } = req.body;
            console.log(orderId, activityId, "orderId, activityId ");

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }
            const attractionOrder = await AttractionOrder.findOne({
                _id: orderId,
            })
                .populate("user", "name email")
                .populate({
                    path: "activities.attraction",
                    select: "id title isApiConnected",
                })
                .populate({
                    path: "activities.activity",
                    select: "id name ",
                });

            if (!attractionOrder) {
                return sendErrorResponse(res, 404, "attraction order not found");
            }

            const actOrder = attractionOrder.activities.find((activity) => {
                return activity._id.toString() === activityId.toString() && activity;
            });

            if (!actOrder) {
                return sendErrorResponse(res, 404, "activity  not found");
            }

            if (actOrder.status === "cancelled") {
                return sendErrorResponse(res, 400, "sorry, this order is already cancelled.");
            }
            if (actOrder.status !== "booked" && actOrder.status !== "confirmed") {
                return sendErrorResponse(res, 400, "Sorry, You can't cancel this order");
            }

            if (Number(cancellationCharge) > actOrder.netPrice) {
                return sendErrorResponse(res, 400, "cancellation charge is greater than net price");
            }

            let prevOrderCancellation = await B2CAttractionOrderCancellation.findOne({
                orderId,
                activityId: activityId,
                $or: [
                    { cancellationStatus: "pending", cancelledBy: "b2c" },
                    { cancellationStatus: "success" },
                ],
            });

            console.log(prevOrderCancellation, "prevOrderCancellation");

            if (prevOrderCancellation) {
                return sendErrorResponse(
                    res,
                    400,
                    "sorry, there is already a pending request or approved cancellation request."
                );
            }

            let orderCancellation = await B2CAttractionOrderCancellation.create({
                cancellationRemark,
                cancellationStatus: "pending",
                orderId,
                userId: attractionOrder?.user?._id,
                cancelledBy: "admin",
                activityId,
                activity: actOrder.activity._id,
                activityName: actOrder.activity.name,
            });

            if (actOrder?.attraction?.isApiConnected === true) {
                return sendErrorResponse(res, 400, "Sorry, You can't cancel this order");
            } else {
                await activityCancellationHelper({ activity: actOrder });

                orderCancellation.cancellationStatus = "success";
                orderCancellation.cancellationCharge = cancellationCharge;
                orderCancellation.cancellationRemark = cancellationRemark;
                orderCancellation.adminId = req.admin?._id;
                await orderCancellation.save();
                await AttractionOrder.findOneAndUpdate(
                    {
                        _id: orderId,
                        "activities._id": activityId,
                    },
                    {
                        "activities.$.status": "cancelled",
                        "activities.$.note": cancellationRemark,
                    },
                    { runValidators: true }
                );
                refundAmount = actOrder.grandTotal - Number(cancellationCharge);
            }
            let attOrderRefund;
            if (refundAmount > 0) {
                attOrderRefund = await B2CAttractionOrderRefund.create({
                    amount: refundAmount,
                    note: "Attraction order cancelled by admin",
                    orderId,
                    paymentMethod: "wallet",
                    userId: attractionOrder?.user,
                    status: "pending",
                    activityId,
                    activity: actOrder.activity._id,
                    activityName: actOrder.activity.name,
                });

                attOrderRefund.status = "success";
                await attOrderRefund.save();
                await B2CTransaction.create({
                    user: attractionOrder.user,
                    paymentProcessor: "wallet",
                    product: "attraction",
                    processId: attractionOrder?._id,
                    description: `Attraction cancellation refund`,
                    debitAmount: 0,
                    creditAmount: refundAmount,
                    directAmount: 0,
                    remark: "Attraction cancellation refund",
                    dateTime: new Date(),
                });
            }

            res.status(200).json({
                message: "order cancellation  successfully submitted.",
                status: actOrder.status,
                cancellation: orderCancellation,
                refund: attOrderRefund,
                activityId: orderCancellation.activityId,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    approveAttractionOrderB2cCancellationRequest: async (req, res) => {
        try {
            const { cancellationId } = req.params;
            const { cancellationCharge } = req.body;

            if (!isValidObjectId(cancellationId)) {
                return sendErrorResponse(res, 400, "invalid cancellation id");
            }

            let orderCancellation = await B2CAttractionOrderCancellation.findById(cancellationId);
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
            const attractionOrder = await B2BAttractionOrder.findOne({
                _id: orderCancellation.orderId,
                user: orderCancellation.userId,
            })
                .populate("user", "email")
                .populate({
                    path: "activities.attraction",
                    select: "id title isApiConnected",
                })
                .populate({
                    path: "activities.activity",
                    select: "id name ",
                });

            if (!attractionOrder) {
                return sendErrorResponse(res, 404, "attraction order not found");
            }

            const actOrder = attractionOrder.activities.find((activity) => {
                return (
                    activity._id.toString() === orderCancellation.activityId.toString() && activity
                );
            });

            if (!actOrder) {
                return sendErrorResponse(res, 404, "activity  not found");
            }

            if (actOrder.status === "cancelled") {
                return sendErrorResponse(res, 400, "sorry, this order is already cancelled.");
            }
            // if (actOrder.status !== "booked" && actOrder.status !== "confirmed") {
            //     return sendErrorResponse(res, 400, "Sorry, You can't cancel this order");
            // }

            if (Number(cancellationCharge) > actOrder?.grandTotal) {
                return sendErrorResponse(res, 400, "cancellation charge is greater than net price");
            }

            if (actOrder?.attraction?.isApiConnected === true) {
                return sendErrorResponse(res, 400, "Sorry, You can't cancel this order");
            } else {
                orderCancellation.cancellationStatus = "success";
                orderCancellation.cancellationCharge = cancellationCharge;
                orderCancellation.adminId = req.admin?._id;
                await activityCancellationHelper({ activity: actOrder });
                await orderCancellation.save();
                await AttractionOrder.findOneAndUpdate(
                    {
                        _id: orderCancellation.orderId,
                        "activities._id": orderCancellation.activityId,
                    },
                    {
                        "activities.$.status": "cancelled",
                        "activities.$.note": orderCancellation?.cancellationRemark,
                    },
                    { runValidators: true }
                );
                refundAmount = Number(actOrder.grandTotal) - Number(cancellationCharge);
            }

            let attOrderRefund;
            if (refundAmount > 0) {
                attOrderRefund = await B2CAttractionOrderRefund.create({
                    amount: refundAmount,
                    note: "Attraction order cancelled by admin",
                    orderId: orderCancellation.orderId,
                    paymentMethod: "wallet",
                    userId: attractionOrder?.user,
                    status: "pending",
                    activityId: orderCancellation.activityId,
                    activity: actOrder.activity._id,
                    activityName: actOrder.activity.name,
                });

                attOrderRefund.status = "success";
                await attOrderRefund.save();
                await B2CTransaction.create({
                    user: attractionOrder.user,
                    paymentProcessor: "wallet",
                    product: "attraction",
                    processId: attractionOrder?._id,
                    description: `Attraction cancellation refund`,
                    debitAmount: 0,
                    creditAmount: refundAmount,
                    directAmount: 0,
                    remark: "Attraction cancellation refund",
                    dateTime: new Date(),
                });
            } else {
                return sendErrorResponse(
                    res,
                    400,
                    "Sorry, You can't cancel this order refund amount is less"
                );
            }
            res.status(200).json({
                message: "order cancellation  successfully submitted.",
                status: actOrder.status,
                cancellation: orderCancellation,
                refund: attOrderRefund,
                activityId: orderCancellation.activityId,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
