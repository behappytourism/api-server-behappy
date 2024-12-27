const { isValidObjectId, Types } = require("mongoose");

const {
    B2BA2aTicket,
    B2BA2a,
    Reseller,
    B2BTransaction,
    B2BWallet,
    B2BA2aOrder,
    B2BMarkupProfile,
    B2BA2aTicketMarkup,
} = require("../../../b2b/models");
const B2BA2aQuota = require("../../../b2b/models/a2a/b2bA2aQuota.model");
const { A2alistAllSchema } = require("../../../b2b/validations/b2bA2a.schema");
const { b2bA2aOrderSchema } = require("../../../b2b/validations/b2bA2aOrder.schema");
const { sendErrorResponse } = require("../../../helpers");
const { generateUniqueString } = require("../../../utils");
const { MarketStrategy } = require("../../models");

module.exports = {
    getA2aDate: async (req, res) => {
        try {
            const tickets = await B2BA2aTicket.find({
                onwardDate: { $gte: new Date().toISOString().slice(0, 10) }, // get onward dates from today onwards
                availableSeats: { $gt: 0 }, // get tickets with available seats
            }).select("onwardDate availableSeats");

            const availableDates = {};

            tickets.forEach((ticket) => {
                const date = ticket.onwardDate.toISOString().slice(0, 10);
                availableDates[date] = (availableDates[date] || 0) + ticket.availableSeats;
            });

            const uniqueDates = Object.keys(availableDates);

            res.status(200).json({ dates: uniqueDates });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    listAllA2a: async (req, res) => {
        try {
            const { date } = req.body;

            const { _, error } = A2alistAllSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const a2aList = await B2BA2aTicket.aggregate([
                {
                    $match: {
                        isDeleted: false,
                        onwardDate: { $eq: new Date(req.body.date) },
                    },
                }, // match onward date with date from frontend
                {
                    $group: {
                        _id: "$a2aReference",
                        count: { $sum: 1 },
                    },
                },

                { $sort: { count: -1 } },
                {
                    $lookup: {
                        from: "b2ba2as",
                        localField: "_id",
                        foreignField: "_id",
                        as: "a2aReference",
                    },
                },
                {
                    $set: {
                        a2aReference: { $arrayElemAt: ["$a2aReference", 0] },
                    },
                },
                {
                    $lookup: {
                        from: "airports",
                        localField: "a2aReference.airportFrom",
                        foreignField: "_id",
                        as: "airportFrom",
                    },
                },
                {
                    $lookup: {
                        from: "airports",
                        localField: "a2aReference.airportTo",
                        foreignField: "_id",
                        as: "airportTo",
                    },
                },
                {
                    $set: {
                        airportFromName: {
                            $arrayElemAt: ["$airportFrom.airportName", 0],
                        },
                        airportFromIata: {
                            $arrayElemAt: ["$airportFrom.iataCode", 0],
                        },
                        aairportToName: {
                            $arrayElemAt: ["$airportTo.airportName", 0],
                        },
                        airportToIata: {
                            $arrayElemAt: ["$airportTo.iataCode", 0],
                        },
                    },
                },
                {
                    $project: {
                        airportFromName: 1,
                        airportFromIata: 1,
                        aairportToName: 1,
                        airportToIata: 1,
                        count: 1,
                    },
                },
            ]);

            if (!a2aList) {
                return sendErrorResponse(res, 500, "A2a list not found!");
            }

            res.status(200).json(a2aList);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    listSingleA2a: async (req, res) => {
        try {
            const { id, resellerId } = req.params;

            const { date } = req.body;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid A2a Id");
            }

            const { _, error } = A2alistAllSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const reseller = await Reseller.findOne({ _id: resellerId });
            if (!reseller) {
                return sendErrorResponse(res, 500, "reseller not found!");
            }

            const b2bA2a = await B2BA2a.findOne({
                _id: id,
                isDeleted: false,
            });

            if (!b2bA2a) {
                return sendErrorResponse(res, 404, "A2a not found");
            }

            let a2aSingleList = await B2BA2aTicket.aggregate([
                {
                    $match: {
                        isDeleted: false,
                        onwardDate: { $eq: new Date(req.body.date) },
                        a2aReference: Types.ObjectId(id),
                    },
                }, // match onward date with date from frontend
                {
                    $lookup: {
                        from: "b2ba2as",
                        localField: "a2aReference",
                        foreignField: "_id",
                        as: "a2aReference",
                    },
                },
                {
                    $lookup: {
                        from: "b2ba2aticketmarkups",
                        localField: "_id",
                        foreignField: "a2aTicketId",
                        as: "markup",
                    },
                },
                {
                    $lookup: {
                        from: "b2bmarkupprofiles",
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        // $and: [
                                        //   {
                                        $eq: [
                                            "$resellerId",
                                            {
                                                $cond: {
                                                    if: {
                                                        $eq: [reseller.role, "sub-agent"],
                                                    },
                                                    then: Types.ObjectId(resellerId),
                                                    else: Types.ObjectId(resellerId),
                                                },
                                            },
                                            //   ],
                                            // },
                                        ],
                                    },
                                },
                            },
                        ],
                        as: "b2bMarkupProfile",
                    },
                },

                {
                    $lookup: {
                        from: "b2ba2aquotas",
                        let: { ticketId: "$_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            {
                                                $eq: [
                                                    "$resellerId",
                                                    {
                                                        $cond: {
                                                            if: {
                                                                $eq: [reseller?.role, "sub-agent"],
                                                            },
                                                            then: Types.ObjectId(resellerId),
                                                            else: Types.ObjectId(resellerId),
                                                        },
                                                    },
                                                ],
                                            },

                                            {
                                                $eq: ["$ticketId", "$$ticketId"],
                                            },
                                        ],
                                    },
                                    isDeleted: false,
                                    isActive: true,
                                },
                            },
                        ],
                        as: "quota",
                    },
                },

                {
                    $set: {
                        a2aReference: { $arrayElemAt: ["$a2aReference", 0] },
                        b2bMarkupProfile: { $arrayElemAt: ["$b2bMarkupProfile", 0] },

                        markup: { $arrayElemAt: ["$markup", 0] },
                        specialMarkup: { $arrayElemAt: ["$specialMarkup", 0] },
                        availableSeats: {
                            $ifNull: [
                                {
                                    $subtract: [
                                        { $arrayElemAt: ["$quota.ticketCountTotal", 0] },
                                        { $arrayElemAt: ["$quota.ticketCountUsed", 0] },
                                    ],
                                },
                                "$availableSeats",
                            ],
                        },
                    },
                },
                {
                    $addFields: {
                        price: {
                            $cond: [
                                { $eq: ["$markup.markupType", "percentage"] },
                                {
                                    $sum: [
                                        "$price",
                                        {
                                            $multiply: [
                                                "$price",
                                                {
                                                    $divide: ["$markup.markup", 100],
                                                },
                                            ],
                                        },
                                    ],
                                },
                                { $sum: ["$price", "$markup.markup"] },
                            ],
                        },
                    },
                },
                {
                    $addFields: {
                        price: {
                            $cond: [
                                {
                                    $eq: ["$specialMarkup.markupType", "percentage"],
                                },
                                {
                                    $sum: [
                                        "$price",
                                        {
                                            $multiply: [
                                                "$price",
                                                {
                                                    $divide: ["$specialMarkup.markup", 100],
                                                },
                                            ],
                                        },
                                    ],
                                },
                                {
                                    $sum: ["$price", "$specialMarkup.markup"],
                                },
                            ],
                        },
                    },
                },
                // {
                //     $addFields: {
                //         price: {
                //             $add: ["$price", "$specialMarkupPrice"],
                //         },
                //     },
                // },

                {
                    $lookup: {
                        from: "airports",
                        localField: "a2aReference.airportFrom",
                        foreignField: "_id",
                        as: "airportFrom",
                    },
                },
                {
                    $lookup: {
                        from: "airports",
                        localField: "a2aReference.airportTo",
                        foreignField: "_id",
                        as: "airportTo",
                    },
                },
                {
                    $lookup: {
                        from: "airlines",
                        localField: "airlineReturn",
                        foreignField: "_id",
                        as: "airlineReturn",
                    },
                },
                {
                    $lookup: {
                        from: "airlines",
                        localField: "airlineOnward",
                        foreignField: "_id",
                        as: "airlineOnward",
                    },
                },
                {
                    $set: {
                        airportFromName: {
                            $arrayElemAt: ["$airportFrom.airportName", 0],
                        },
                        airportFromIata: {
                            $arrayElemAt: ["$airportFrom.iataCode", 0],
                        },
                        airportToName: {
                            $arrayElemAt: ["$airportTo.airportName", 0],
                        },
                        airportToIata: {
                            $arrayElemAt: ["$airportTo.iataCode", 0],
                        },
                        airlineOnward: {
                            $arrayElemAt: ["$airlineOnward.airlineName", 0],
                        },
                        airlineOnwardLogo: {
                            $arrayElemAt: ["$airlineOnward.image", 0],
                        },
                        airlineReturn: {
                            $arrayElemAt: ["$airlineReturn.airlineName", 0],
                        },
                        airlineReturnLogo: {
                            $arrayElemAt: ["$airlineReturn.image", 0],
                        },
                    },
                },
                {
                    $project: {
                        airportFromName: 1,
                        airportFromIata: 1,
                        airportToName: 1,
                        airportToIata: 1,
                        a2aReference: 1,
                        b2bMarkupProfile: 1,
                        airlineOnward: 1,
                        airlineReturnLogo: 1,
                        airlineOnwardLogo: 1,
                        airlineReturn: 1,
                        airlineOnwardNo: 1,
                        airlineReturnNo: 1,
                        onwardDate: 1,
                        returnDate: 1,
                        takeOffTimeOnward: 1,
                        takeOffTimeReturn: 1,
                        landingTimeOnward: 1,
                        landingTimeReturn: 1,
                        price: 1,
                        infantPrice: 1,
                        availableSeats: 1,
                        pnrNo: 1,
                        termsAndCond: 1,
                        note: 1,
                        count: 1,
                    },
                },
            ]);

            if (!a2aSingleList) {
                return sendErrorResponse(res, 500, "A2a list not found!");
            }

            let market = await MarketStrategy.findOne({ _id: reseller?.marketStrategy });

            a2aSingleList = a2aSingleList.map((a2aSingleList) => {
                const { price } = a2aSingleList;

                if (a2aSingleList?.b2bMarkupProfile) {
                    const marketMarkup = market?.atoA?.find(
                        (atoA) =>
                            a2aSingleList?.a2aReference?._id?.toString() === atoA?.atoa?.toString()
                    );

                    if (marketMarkup) {
                        if (marketMarkup?.markupType === "percentage") {
                            const markupAmount = marketMarkup?.markup / 100;
                            a2aSingleList.price = price * (1 + markupAmount);
                        } else if (marketMarkup?.markupType === "flat") {
                            a2aSingleList.price = price + marketMarkup?.markup;
                        }
                    }

                    const markup = a2aSingleList?.b2bMarkupProfile?.atoA.find(
                        (atoA) =>
                            a2aSingleList?.a2aReference?._id.toString() === atoA?.atoa?.toString()
                    );

                    if (markup) {
                        if (markup?.markupType === "percentage") {
                            const markupAmount = markup?.markup / 100;
                            a2aSingleList.price = price * (1 + markupAmount);
                        } else if (markup?.markupType === "flat") {
                            a2aSingleList.price = price + markup?.markup;
                        }
                    }
                }

                return {
                    ...a2aSingleList,
                };
            });

            res.status(200).json({ a2aSingleList });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    createA2aOrder: async (req, res) => {
        try {
            const { a2aTicket, noOfTravellers, passengerDetails, date, markup } = req.body;

            const { _, error } = b2bA2aOrderSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const { resellerId } = req.params;

            const reseller = await Reseller.findOne({ _id: resellerId });
            if (!reseller) {
                return sendErrorResponse(res, 500, "reseller not found!");
            }

            const a2aTicketDetails = await B2BA2aTicket.findOne({
                _id: a2aTicket,
                isDeleted: false,
            });

            if (!a2aTicketDetails) {
                return sendErrorResponse(res, 400, "A2A Ticket Not Found");
            }

            const b2bA2aQuota = await B2BA2aQuota.findOne({
                ticketId: a2aTicket,
                resellerId: reseller._id,
                isDeleted: false,
                isActive: true,
            });

            if (!b2bA2aQuota) {
                if (a2aTicketDetails.availableSeats < noOfTravellers) {
                    return sendErrorResponse(
                        res,
                        400,
                        `Only ${a2aTicketDetails.availableSeats} tickets is left `
                    );
                }
            } else {
                if (
                    Number(b2bA2aQuota.ticketCountTotal) - Number(b2bA2aQuota.ticketCountUsed) <
                    Number(noOfTravellers)
                ) {
                    return sendErrorResponse(
                        res,
                        400,
                        `Only ${b2bA2aQuota.ticketCountTotal} tickets is left `
                    );
                }
            }

            if (Number(noOfTravellers) !== passengerDetails.length) {
                return sendErrorResponse(res, 400, "PassengerDetails Not Added ");
            }

            let b2bA2aMarkup = await B2BA2aTicketMarkup.findOne({
                a2aTicketId: a2aTicketDetails?._id,
            });

            let totalAdultMarkup = 0;
            let totalInfantMarkup = 0;
            if (b2bA2aMarkup) {
                if (b2bA2aMarkup.markupType === "flat") {
                    totalAdultMarkup = b2bA2aMarkup.markup;
                    totalInfantMarkup = b2bA2aMarkup.markup;
                } else {
                    totalAdultMarkup = (b2bA2aMarkup.markup * a2aTicketDetails.price) / 100;
                    totalInfantMarkup = (b2bA2aMarkup.markup * a2aTicketDetails.infantPrice) / 100;
                }
            }

            const a2aProfileMarkup = await B2BMarkupProfile.findOne({
                resellerId: reseller._id,
            });

            if (a2aProfileMarkup) {
                const profileMarkup = a2aProfileMarkup?.atoA?.find(
                    (atoA) => a2aTicketDetails?.a2aReference?.toString() === atoA?.atoa?.toString()
                );

                if (profileMarkup) {
                    if (profileMarkup?.markupType === "flat") {
                        totalAdultMarkup += profileMarkup?.markup;
                        totalInfantMarkup += profileMarkup?.markup;
                    } else {
                        let totalAddedAdultPrice =
                            Number(a2aTicketDetails?.price) + Number(totalAdultMarkup);
                        let totalAddedInfantPrice =
                            Number(a2aTicketDetails?.infantPrice) + Number(totalInfantMarkup);
                        totalAdultMarkup +=
                            (Number(profileMarkup?.markup) * Number(totalAddedAdultPrice)) / 100;
                        totalInfantMarkup +=
                            (Number(profileMarkup?.markup) * Number(totalAddedInfantPrice)) / 100;
                    }
                }
            }

            let amount = 0;

            for (i = 0; i < passengerDetails?.length; i++) {
                passengerDetails[i].amount =
                    Number(a2aTicketDetails?.price) + Number(totalAdultMarkup);
                passengerDetails[i].profit = totalAdultMarkup;
                if (passengerDetails[i].isInfant) {
                    passengerDetails[i].amount +=
                        Number(a2aTicketDetails?.infantPrice) + Number(totalInfantMarkup);
                    passengerDetails[i].profit += totalInfantMarkup;
                }
                passengerDetails[i].status = "pending";

                amount += Number(passengerDetails[i]?.amount);
            }

            let totalAmount = Number(amount) + Number(markup);

            const otp = 12345;

            const newA2aOrder = new B2BA2aOrder({
                reseller: reseller._id,
                orderedBy: reseller.role,
                a2aTicket,
                noOfTravellers,
                date,
                passengerDetails,
                totalAmount,
                orderStatus: "pending",
                referenceNumber: generateUniqueString("B2BA2A"),
                markup,
                amount,
                totalAmount,
                otp,
            });

            await newA2aOrder.save();

            res.status(200).json({
                _id: newA2aOrder._id,
                message: "new order created. please complete payment !",
            });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    completeA2aOrder: async (req, res) => {
        try {
            const { orderId } = req.params;
            const { otp = 12345 } = req.body;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            const a2aOrder = await B2BA2aOrder.findOne({
                _id: orderId,
            });

            if (!a2aOrder) {
                return sendErrorResponse(res, 404, "A2a order not found");
            }

            const reseller = await Reseller.findOne({ _id: a2aOrder.reseller });
            if (!reseller) {
                return sendErrorResponse(res, 500, "reseller not found!");
            }

            if (a2aOrder.orderStatus === "paid") {
                return sendErrorResponse(res, 400, "sorry, you have already completed this order!");
            }

            if (!Number(a2aOrder.otp) || Number(a2aOrder.otp) !== Number(otp)) {
                return sendErrorResponse(res, 400, "incorrect otp!");
            }

            const a2aTicket = await B2BA2aTicket.findOne({
                _id: a2aOrder.a2aTicket,
                isDeleted: false,
            });

            if (!a2aTicket) {
                return sendErrorResponse(res, 404, "A2a Ticket not found");
            }

            const b2bA2aQuota = await B2BA2aQuota.findOne({
                ticketId: a2aTicket,
                resellerId: reseller._id,
                isDeleted: false,
                isActive: true,
            });

            if (!b2bA2aQuota) {
                if (a2aTicket.availableSeats < a2aOrder.noOfTravellers) {
                    return sendErrorResponse(
                        res,
                        400,
                        `Only ${a2aTicketDetails.availableSeats} tickets is left `
                    );
                }
            } else {
                if (
                    Number(b2bA2aQuota.ticketCountTotal) - Number(b2bA2aQuota.ticketCountUsed) <
                    a2aOrder.noOfTravellers
                ) {
                    return sendErrorResponse(
                        res,
                        400,
                        `Only ${
                            Number(b2bA2aQuota.ticketCountTotal) -
                            Number(b2bA2aQuota.ticketCountUsed)
                        } tickets is left `
                    );
                }
            }

            let amount = a2aOrder.amount;

            let wallet = await B2BWallet.findOne({
                reseller: reseller?._id,
            });

            if (!wallet || wallet.balance < amount) {
                sendInsufficentBalanceMail(reseller);
                // return sendErrorResponse(
                //     res,
                //     400,
                //     "Insufficient balance. please reacharge and try again"
                // );
            }

            if (
                !wallet ||
                Number(wallet?.balance) +
                    (Number(wallet?.creditAmount) - Number(wallet?.creditUsed)) <
                    Number(amount)
            ) {
                // let reseller = req.reseller;
                // sendInsufficentBalanceMail(reseller);
                return sendErrorResponse(
                    res,
                    400,
                    "Insufficient balance. please reacharge and try again"
                );
            }

            if (wallet.balance < amount) {
                wallet.creditUsed += Number(amount) - Number(wallet.balance);
                wallet.balance = 0;
                await wallet.save();
            } else {
                wallet.balance -= amount;
                await wallet.save();
            }

            await B2BTransaction.create({
                reseller: reseller?._id,
                paymentProcessor: "wallet",
                product: "a2a",
                processId: orderId,
                description: `A2a booking payment`,
                debitAmount: amount,
                creditAmount: 0,
                directAmount: 0,
                closingBalance: wallet.balance,
                dueAmount: wallet.creditUsed,
                remark: "A2a booking payment",
                dateTime: new Date(),
            });

            if (!b2bA2aQuota) {
                a2aTicket.availableSeats -= a2aOrder.noOfTravellers;
                await a2aTicket.save();
            } else {
                b2bA2aQuota.ticketCountUsed += a2aOrder.noOfTravellers;
                await b2bA2aQuota.save();
            }

            for (i = 0; i < a2aOrder.passengerDetails.length; i++) {
                a2aOrder.passengerDetails[i].ticketNo = a2aTicket.pnrNo;
                a2aOrder.passengerDetails[i].status = "booked";
            }

            a2aOrder.orderStatus = "paid";
            await a2aOrder.save();

            res.status(200).json({
                message: "Amount Paided successfully ",
                a2aOrder,
            });
        } catch (err) {
            console.log(err, "err");
            sendErrorResponse(res, 500, err);
        }
    },
};
