const moment = require("moment");

const { B2bHotelOrder, B2BHotelOrderCancellation } = require("../../../b2b/models/hotel");
const { sendErrorResponse } = require("../../../helpers");
const { hasPermission } = require("../../utils/global");

module.exports = {
    getHotelDashboardData: async (req, res) => {
        try {
            let promises = [];
            let recentHotelOrders;
            if (
                hasPermission({
                    roles: req.admin?.roles || [],
                    name: "recent-hotel-reservations",
                    permission: "view",
                })
            ) {
                promises.push(
                    (async () => {
                        recentHotelOrders = await B2bHotelOrder.find({
                            $or: [{ status: "booked" }, { status: "confirmed" }],
                        })
                            .sort({ createdAt: -1 })
                            .limit(5)
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
                                "hotel reseller referenceNumber createdAt _id fromDate toDate totalAdults totalChildren netPrice status roomsCount paymentState"
                            )
                            .lean();
                    })()
                );
            }

            let unConfirmedBookings;
            if (
                hasPermission({
                    roles: req.admin?.roles || [],
                    name: "unconfirmed-hotel-reservations",
                    permission: "view",
                })
            ) {
                promises.push(
                    (async () => {
                        unConfirmedBookings = await B2bHotelOrder.find({
                            $or: [{ status: "booked" }],
                            fromDate: {
                                $gte: moment(
                                    moment()
                                        .utcOffset(0)
                                        .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                                ).toDate(),
                            },
                        })
                            .sort({ fromDate: 1 })
                            .limit(5)
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
                                "hotel reseller referenceNumber createdAt _id fromDate toDate totalAdults totalChildren netPrice status roomsCount paymentState"
                            )
                            .lean();
                    })()
                );
            }

            let expiringHotelPayLaterOrders;
            if (
                hasPermission({
                    roles: req.admin?.roles || [],
                    name: "hotel-expiring-paylater-report",
                    permission: "view",
                })
            ) {
                promises.push(
                    (async () => {
                        expiringHotelPayLaterOrders = await B2bHotelOrder.find({
                            paymentState: { $ne: "fully-paid" },
                            $or: [{ status: "booked" }, { status: "confirmed" }],
                            lastDateForPayment: {
                                $gte: moment(
                                    moment()
                                        .utcOffset(0)
                                        .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                                ).toDate(),
                            },
                        })
                            .sort({ lastDateForPayment: 1 })
                            .limit(5)
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
                    })()
                );
            }

            let topHotelsList;
            if (
                hasPermission({
                    roles: req.admin?.roles || [],
                    name: "top-hotel-reservation-hotels",
                    permission: "view",
                })
            ) {
                promises.push(
                    (async () => {
                        topHotelsList = await B2bHotelOrder.aggregate([
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
                            { $limit: 5 },
                        ]);
                    })()
                );
            }

            let topResellersList;
            if (
                hasPermission({
                    roles: req.admin?.roles || [],
                    name: "top-hotel-reservation-resellers",
                    permission: "view",
                })
            ) {
                promises.push(
                    (async () => {
                        topResellersList = await B2bHotelOrder.aggregate([
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
                            { $limit: 5 },
                        ]);
                    })()
                );
            }

            let nextDayHotelArrivalsList;
            if (
                hasPermission({
                    roles: req.admin?.roles || [],
                    name: "next-day-arrival-hotel-reservations",
                    permission: "view",
                })
            ) {
                promises.push(
                    (async () => {
                        nextDayHotelArrivalsList = await B2bHotelOrder.find({
                            status: "confirmed",
                            paymentState: "fully-paid",
                            fromDate: moment(
                                moment()
                                    .add(1, "d")
                                    .utcOffset(0)
                                    .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                            ).toDate(),
                        })
                            .sort({ createdAt: -1 })
                            .limit(5)
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
                                "hotel reseller referenceNumber createdAt _id fromDate toDate totalAdults totalChildren netPrice status roomsCount paymentState"
                            )
                            .lean();
                    })()
                );
            }

            let nextDayHotelDeparturesList;
            if (
                hasPermission({
                    roles: req.admin?.roles || [],
                    name: "next-day-departure-hotel-reservations",
                    permission: "view",
                })
            ) {
                promises.push(
                    (async () => {
                        nextDayHotelDeparturesList = await B2bHotelOrder.find({
                            status: "confirmed",
                            paymentState: "fully-paid",
                            toDate: moment(
                                moment()
                                    .add(1, "d")
                                    .utcOffset(0)
                                    .set({ hour: 0, minute: 0, second: 0, millisecond: 0 })
                            ).toDate(),
                        })
                            .sort({ createdAt: -1 })
                            .limit(5)
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
                                "hotel reseller referenceNumber createdAt _id fromDate toDate totalAdults totalChildren netPrice status roomsCount paymentState"
                            )
                            .lean();
                    })()
                );
            }

            let recentCancellationRequests;
            if (
                hasPermission({
                    roles: req.admin?.roles || [],
                    name: "hotel-recent-cancellation-requests",
                    permission: "view",
                })
            ) {
                promises.push(
                    (async () => {
                        recentCancellationRequests = await B2BHotelOrderCancellation.find({
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
                                },
                            })
                            .lean();
                    })()
                );
            }

            await Promise.all([...promises]);

            res.status(200).json({
                recentHotelOrders,
                unConfirmedBookings,
                expiringHotelPayLaterOrders,
                topHotelsList,
                topResellersList,
                nextDayHotelArrivalsList,
                nextDayHotelDeparturesList,
                recentCancellationRequests,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
