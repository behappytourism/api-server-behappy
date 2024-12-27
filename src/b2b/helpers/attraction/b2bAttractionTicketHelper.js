const { B2BAttractionOrder } = require("../../models");
const { isValidObjectId, Types } = require("mongoose");
const { AttractionTicketSetting } = require("../../../models");
const createBookingTicketPdfTheme2 = require("./styles/createBookingTicketPdfTheme2");
const createBookingPdfTheme3 = require("./styles/createBookingPdfTheme3");
const createBookingTicketPdf = require("../bookingTicketsHelper");
const createMultipleTicketPdfTheme2 = require("./createMultipleTicketTheme2");
const createMultipleTicketPdfTheme3 = require("./createMultipleTicketTheme3");
const createMultipleTicketPdf = require("../multipleTicketHelper");

const b2bAttractionPdfBufferHelper = async ({ orderId, activityId }) => {
    try {
        const orderDetails = await B2BAttractionOrder.aggregate([
            {
                $match: {
                    _id: Types.ObjectId(orderId),
                    $or: [{ orderStatus: "completed" }, { orderStatus: "paid" }],
                    activities: {
                        $elemMatch: { _id: Types.ObjectId(activityId) },
                    },
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
                console.log(orderDetails[0].name, "name");
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

module.exports = { b2bAttractionPdfBufferHelper };
