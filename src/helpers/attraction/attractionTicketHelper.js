const { updateTicketCountCache } = require("../../config/cache");
const { AttractionTicket, AttractionOrder, AttractionTicketSetting } = require("../../models");
const { isValidObjectId, Types } = require("mongoose");
const moment = require("moment");
const createBookingTicketPdfTheme2 = require("../../b2b/helpers/attraction/styles/createBookingTicketPdfTheme2");
const createBookingPdfTheme3 = require("../../b2b/helpers/attraction/styles/createBookingPdfTheme3");
const createBookingTicketPdf = require("../../b2b/helpers/bookingTicketsHelper");
const createMultipleTicketPdfTheme2 = require("../../b2b/helpers/attraction/createMultipleTicketTheme2");
const createMultipleTicketPdfTheme3 = require("../../b2b/helpers/attraction/createMultipleTicketTheme3");
const createMultipleTicketPdf = require("../../b2b/helpers/multipleTicketHelper");

const updateTicketCountHelper = async ({ attraction, activity, date }) => {
    try {
        console.log("call reached here", date, new Date());
        let adultTicketCount = await AttractionTicket.find({
            activity: activity,
            ticketFor: "adult",
            status: "ok",
            $and: [
                {
                    $or: [
                        {
                            validity: true,
                            validTill: {
                                $gte: new Date(date).toISOString(),
                            },
                        },
                        { validity: false },
                    ],
                },
                {
                    $or: [
                        {
                            reservationValidity: { $exists: true },
                            reservationValidity: {
                                $lte: moment().utc().valueOf(),
                            },
                        },
                        { reservationValidity: null },
                        { reservationValidity: { $exists: false } },
                    ],
                },
            ],
        }).count();

        let childTicketCount = await AttractionTicket.find({
            activity: activity,
            ticketFor: "child",
            status: "ok",
            $and: [
                {
                    $or: [
                        {
                            validity: true,
                            validTill: {
                                $gte: new Date(date).toISOString(),
                            },
                        },
                        { validity: false },
                    ],
                },
                {
                    $or: [
                        {
                            reservationValidity: { $exists: true },
                            reservationValidity: {
                                $lte: moment().utc().valueOf(),
                            },
                        },
                        { reservationValidity: null },
                        { reservationValidity: { $exists: false } },
                    ],
                },
            ],
        }).count();

        let infantTicketCount = await AttractionTicket.find({
            activity: activity,
            ticketFor: "infant",
            status: "ok",
            $and: [
                {
                    $or: [
                        {
                            validity: true,
                            validTill: {
                                $gte: new Date(date).toISOString(),
                            },
                        },
                        { validity: false },
                    ],
                },
                {
                    $or: [
                        {
                            reservationValidity: { $exists: true },
                            reservationValidity: {
                                $lte: moment().utc().valueOf(),
                            },
                        },
                        { reservationValidity: null },
                        { reservationValidity: { $exists: false } },
                    ],
                },
            ],
        }).count();

        await updateTicketCountCache({
            attraction: attraction.toString(),
            activity: activity.toString(),
            adultCount: adultTicketCount || 0,
            childCount: childTicketCount || 0,
            infantCount: infantTicketCount || 0,
        });

        console.log(adultTicketCount, childTicketCount, "childTicketCount");

        return {
            adultCount: adultTicketCount || 0,
            childCount: childTicketCount || 0,
            infantCount: infantTicketCount || 0,
        };
    } catch (err) {
        throw err;
    }
};

const b2cAttractionPdfBufferHelper = async ({ orderId, activityId }) => {
    try {
        const orderDetails = await AttractionOrder.aggregate([
            {
                $match: {
                    _id: Types.ObjectId(orderId),
                    orderStatus: "completed",
                    activities: {
                        $elemMatch: { _id: Types.ObjectId(activityId) },
                    },
                },
            },
            { $unwind: "$activities" },
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
                        },
                        attraction: {
                            title: 1,
                            logo: 1,
                            images: 1,
                        },
                        destination: {
                            name: 1,
                        },
                        _id: 1,
                        bookingConfirmationNumber: 1,
                        note: 1,
                        adultTickets: 1,
                        childrenTickets: 1,
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
            throw new Error("attraction order not found");
        }
        const theme = await AttractionTicketSetting.findOne({});

        if (orderDetails[0].activities.bookingType === "booking") {
            // if (orderDetails[0].activities.status != "confirmed") {
            //     return sendErrorResponse(res, 400, "order not confirmed");
            // }

            if (theme.selected.toString() === "theme2") {
                const pdfBuffer = await createBookingTicketPdfTheme2(orderDetails[0].activities);

                return { pdfBuffer };
            } else if (theme.selected.toString() === "theme3") {
                const pdfBuffer = await createBookingPdfTheme3(
                    orderDetails[0].activities,
                    orderDetails[0].name
                );

                return { pdfBuffer };
            } else {
                const pdfBuffer = await createBookingTicketPdf(orderDetails[0].activities);

                return { pdfBuffer };
            }
        } else {
            if (theme.selected.toString() === "theme2") {
                const pdfBuffer = await createMultipleTicketPdfTheme2(orderDetails[0].activities);

                return { pdfBuffer };
            } else if (theme.selected.toString() === "theme3") {
                const pdfBuffer = await createMultipleTicketPdfTheme3(
                    orderDetails[0].activities,
                    orderDetails[0].name
                );

                return { pdfBuffer };
            } else {
                const pdfBuffer = await createMultipleTicketPdf(orderDetails[0].activities);

                return { pdfBuffer };
            }
        }
    } catch (err) {
        throw err;
    }
};

module.exports = { updateTicketCountHelper, b2cAttractionPdfBufferHelper };
