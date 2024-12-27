const { B2BA2aTicket, B2BA2a } = require("../../models");
const { isValidObjectId, Types } = require("mongoose");

const { b2bAttractionOrderSchema } = require("../../validations/b2bAttractionOrder.schema");
const { sendErrorResponse, sendMobileOtp } = require("../../../helpers");
const { A2alistAllSchema } = require("../../validations/b2bA2a.schema");

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


            res.status(200).json({ a2aList });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    listSingleA2a: async (req, res) => {
        try {
            const { id } = req.params;


            const { date } = req.body;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid A2a Id");
            }

            const { _, error } = A2alistAllSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
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
                                                        $eq: [req.reseller.role, "sub-agent"],
                                                    },
                                                    then: Types.ObjectId(req.reseller?.referredBy), 
                                                    else:  Types.ObjectId(req.reseller?._id),
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
                        from: "b2bspeciala2amarkups",

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
                                                                $eq: [
                                                                    req.reseller.role,
                                                                    "sub-agent",
                                                                ],
                                                            },
                                                            then: req.reseller?.referredBy,
                                                            else: req.reseller?._id,
                                                        },
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                },
                            },
                        ],
                        as: "specialMarkup",
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
                                                                $eq: [
                                                                    req.reseller.role,
                                                                    "sub-agent",
                                                                ],
                                                            },
                                                            then:  Types.ObjectId(req.reseller?.referredBy),
                                                            else:  Types.ObjectId(req.reseller?._id),
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

            a2aSingleList = a2aSingleList.map((a2aSingleList) => {
                const { price } = a2aSingleList;

                if (a2aSingleList?.b2bMarkupProfile) {
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
            sendErrorResponse(res, 500, err);
        }
    },

    singleA2aTicket: async (req, res) => {
        try {
            const { id } = req.params;


            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid A2a Ticket Id");
            }

            let a2aSingleList = await B2BA2aTicket.aggregate([
                {
                    $match: {
                        isDeleted: false,
                        _id: Types.ObjectId(id),
                    },
                },
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
                                                        $eq: [req.reseller.role, "sub-agent"],
                                                    },
                                                    then: req.reseller?.referredBy,
                                                    else: req.reseller?._id,
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
                        from: "b2bspeciala2amarkups",
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
                                                                $eq: [
                                                                    req.reseller.role,
                                                                    "sub-agent",
                                                                ],
                                                            },
                                                            then: req.reseller?.referredBy,
                                                            else: req.reseller?._id,
                                                        },
                                                    },
                                                ],
                                            },
                                        ],
                                    },
                                },
                            },
                        ],
                        as: "specialMarkup",
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
                                                                $eq: [
                                                                    req.reseller.role,
                                                                    "sub-agent",
                                                                ],
                                                            },
                                                            then: req.reseller?.referredBy,
                                                            else: req.reseller?._id,
                                                        },
                                                    },
                                                ],
                                            },

                                            {
                                                $eq: ["$ticketId", "$$ticketId"],
                                            },
                                        ],
                                    },
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

            if (!a2aSingleList[0]) {
                return sendErrorResponse(res, 500, "A2a list not found!");
            }

            a2aSingleList = a2aSingleList.map((a2aSingleList) => {
                const { price } = a2aSingleList;
                const markup = a2aSingleList?.b2bMarkupProfile?.atoA?.find(
                    (atoA) => a2aSingleList?.a2aReference?._id?.toString() === atoA?.atoa?.toString()
                );

                if (markup) {
                    if (markup?.markupType === "percentage") {
                        const markupAmount = markup?.markup / 100;
                        a2aSingleList.price = price * (1 + markupAmount);
                    } else if (markup?.markupType === "flat") {
                        a2aSingleList.price = price + markup?.markup;
                    }
                }

                return {
                    ...a2aSingleList,
                };
            });

            res.status(200).json(a2aSingleList[0]);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
