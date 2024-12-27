const { createDubaiParkOrder, confirmTicket } = require("../b2b/helpers");
const { AttractionTicket, AttractionActivity } = require("../models");

module.exports = {
    completeOrderAfterPayment: async (attractionOrder) => {
        try {
            for (let i = 0; i < attractionOrder.activities?.length; i++) {
                const activity = await AttractionActivity.findOne({
                    _id: attractionOrder.activities[i].activity,
                }).populate("attraction");

                let totalPurchaseCost = attractionOrder.activities[i].totalCost;

                if (
                    activity.attraction._id == "63afca1b5896ed6d0f297449" &&
                    activity.attraction.isApiConnected &&
                    activity.isApiSync == true
                ) {
                    let data = await createDubaiParkOrder(
                        activity.attraction.connectedApi,
                        attractionOrder,
                        attractionOrder.activities[i],
                        activity
                    );

                    console.log(data, "data");

                    let adultTicketIds = [];
                    let childTicketIds = [];
                    for (let j = 0; j < data.MediaCodeList.length; j++) {
                        let ticketFor =
                            j < attractionOrder.activities[i]?.adultsCount ? "adult" : "child";

                        const ticket = {
                            ticketNo: data.MediaCodeList[j].MediaCode,
                            lotNo: data.PNR,
                            ticketFor: ticketFor === "adult" ? "adult" : "child",
                            activity: activity._id,
                            status: "used",
                            ticketCost:
                                ticketFor === "adult" ? activity.adultPrice : activity.childPrice,
                        };

                        if (ticketFor == "adult") {
                            adultTicketIds.push(ticket);
                        } else {
                            childTicketIds.push(ticket);
                        }
                    }

                    attractionOrder.activities[i].adultTickets = adultTicketIds;
                    attractionOrder.activities[i].childTickets = childTicketIds;
                    attractionOrder.activities[i].status = "confirmed";
                    // attractionOrder.activities[i].totalCost = totalPurchaseCost;
                    attractionOrder.activities[i].profit =
                        attractionOrder.activities[i].grandTotal -
                        attractionOrder.activities[i].totalCost;
                } else if (
                    activity.attraction._id == "63ff12f5d7333637a938cad4" &&
                    activity.attraction.isApiConnected &&
                    activity.isApiSync == true
                ) {
                    const timestamp = new Date().getTime();

                    const randomNumber = Math.floor(Math.random() * 100000000);

                    console.log(timestamp, "timestamp");

                    const voucherNumber = parseInt(
                        `${i}${randomNumber}${timestamp}`.substring(0, 8)
                    );

                    let confirmResponse = await confirmTicket(
                        attractionOrder.name,
                        attractionOrder.activities[i].bookingReferenceNo,
                        voucherNumber
                    );

                    attractionOrder.activities[i].voucherNumber = voucherNumber;
                    attractionOrder.activities[i].bookingConfirmationNumber =
                        confirmResponse.OrderNo;
                    attractionOrder.activities[i].status = "confirmed";
                    attractionOrder.activities[i].profit =
                        attractionOrder.activities[i].grandTotal -
                        attractionOrder.activities[i].totalCost;
                } else {
                    if (attractionOrder.activities[i].bookingType === "ticket") {
                        let adultTickets = [];
                        if (attractionOrder.activities[i].adultsCount > 0) {
                            adultTickets = await AttractionTicket.find({
                                activity: attractionOrder.activities[i].activity,
                                status: "ok",
                                $and: [
                                    {
                                        $or: [{ ticketFor: "adult" }, { ticketFor: "common" }],
                                    },
                                    {
                                        $or: [
                                            {
                                                validity: true,
                                                validTill: {
                                                    $gte: new Date(
                                                        attractionOrder.activities[i].date
                                                    ).toISOString(),
                                                },
                                            },
                                            { validity: false },
                                        ],
                                    },
                                ],
                            })
                                .limit(attractionOrder.activities[i].adultsCount)
                                .lean();
                        }

                        if (adultTickets.length !== attractionOrder.activities[i].adultsCount) {
                            return sendErrorResponse(res, 400, "tickets sold out.");
                        }

                        let childTickets = [];
                        if (attractionOrder.activities[i].childrenCount > 0) {
                            childTickets = await AttractionTicket.find({
                                activity: attractionOrder.activities[i].activity,
                                status: "ok",
                                $and: [
                                    {
                                        $or: [{ ticketFor: "child" }, { ticketFor: "common" }],
                                    },
                                    {
                                        $or: [
                                            {
                                                validity: true,
                                                validTill: {
                                                    $gte: new Date(
                                                        attractionOrder.activities[i].date
                                                    ).toISOString(),
                                                },
                                            },
                                            { validity: false },
                                        ],
                                    },
                                ],
                            })
                                .limit(attractionOrder.activities[i].childrenCount)
                                .lean();
                        }

                        if (childTickets.length !== attractionOrder.activities[i].childrenCount) {
                            return sendErrorResponse(res, 400, "tickets sold out.");
                        }

                        let infantTickets = [];
                        if (
                            activity.infantPrice > 0 &&
                            attractionOrder.activities[i].infantCount > 0
                        ) {
                            infantTickets = await AttractionTicket.find({
                                activity: attractionOrder.activities[i].activity,
                                status: "ok",
                                $and: [
                                    {
                                        $or: [{ ticketFor: "infant" }, { ticketFor: "common" }],
                                    },
                                    {
                                        $or: [
                                            {
                                                validity: true,
                                                validTill: {
                                                    $gte: new Date(
                                                        attractionOrder.activities[i].date
                                                    ).toISOString(),
                                                },
                                            },
                                            { validity: false },
                                        ],
                                    },
                                ],
                            })
                                .limit(attractionOrder.activities[i].infantCount)
                                .lean();

                            if (
                                infantTickets.length !== attractionOrder.activities[i].infantCount
                            ) {
                                return sendErrorResponse(res, 400, "tickets sold out.");
                            }

                            const infantTicketsIds = infantTickets.map((ticket) => {
                                totalPurchaseCost += ticket.ticketCost;
                                return ticket?._id;
                            });

                            await AttractionTicket.find({
                                activity: attractionOrder.activities[i].activity,
                                _id: infantTicketsIds,
                            }).updateMany({ status: "used" });
                        }

                        const adultTicketsIds = adultTickets.map((ticket) => {
                            totalPurchaseCost += ticket.ticketCost;
                            return ticket?._id;
                        });

                        await AttractionTicket.find({
                            activity: attractionOrder.activities[i].activity,
                            _id: adultTicketsIds,
                        }).updateMany({ status: "used" });

                        const childTicketsIds = childTickets.map((ticket) => {
                            totalPurchaseCost += ticket.ticketCost;
                            return ticket?._id;
                        });

                        await AttractionTicket.find({
                            activity: attractionOrder.activities[i].activity,
                            _id: childTicketsIds,
                        }).updateMany({ status: "used" });

                        attractionOrder.activities[i].adultTickets = adultTickets;
                        attractionOrder.activities[i].childTickets = childTickets;
                        attractionOrder.activities[i].infantTickets = infantTickets;
                        attractionOrder.activities[i].status = "confirmed";
                    } else {
                        attractionOrder.activities[i].status = "booked";
                    }
                    attractionOrder.activities[i].totalCost = totalPurchaseCost;
                    attractionOrder.activities[i].profit =
                        attractionOrder.activities[i].grandTotal -
                        attractionOrder.activities[i].totalCost;
                }
            }
        } catch (err) {
            throw err;
        }
    },
};
