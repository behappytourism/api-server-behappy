const { isValidObjectId, Types } = require("mongoose");
const { B2BA2aTicket, B2BA2a } = require("../../../b2b/models");
const { sendErrorResponse } = require("../../../helpers");
const { addA2aTicketSchema } = require("../../validations/admA2aTicket.schema");

module.exports = {
    addNewA2aTicket: async (req, res) => {
        try {
            const {
                a2aReference,
                airlineOnward,
                airlineReturn,
                airlineOnwardNo,
                airlineReturnNo,
                onwardDate,
                returnDate,
                onwardDurationHr,
                onwardDurationMin,
                returnDurationHr,
                returnDurationMin,
                takeOffTimeOnward,
                takeOffTimeReturn,
                landingTimeOnward,
                landingTimeReturn,
                price,
                infantPrice,
                totalSeats,
                pnrNo,
                termsAndCond,
                note,
                cancellationTime,
            } = req.body;

            const { _, error } = addA2aTicketSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const b2bA2a = await B2BA2a.findOne({
                _id: a2aReference,
                isDeleted: false,
            });
            if (!b2bA2a) {
                return sendErrorResponse(res, 404, "A2a not found");
            }

            let b2bA2aTicket = new B2BA2aTicket({
                a2aReference,
                airlineOnward,
                airlineReturn,
                airlineOnwardNo,
                airlineReturnNo,
                onwardDate,
                returnDate,
                onwardDurationHr,
                onwardDurationMin,
                returnDurationHr,
                returnDurationMin,
                takeOffTimeOnward,
                takeOffTimeReturn,
                landingTimeOnward,
                landingTimeReturn,
                price,
                infantPrice,
                availableSeats: totalSeats,
                totalSeats,
                pnrNo,
                termsAndCond,
                note,
                cancellationTime,
            });

            await b2bA2aTicket.save();

            res.status(200).json({
                _id: b2bA2aTicket._id,
                messgae: "New A2A Ticket Created",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    listAllA2aTicket: async (req, res) => {
        try {
            const { skip = 0, limit = 10, searchInput, onwardDate } = req.query;
            const { id } = req.params;

            console.log(searchInput, "searchInput", "onwardDate", onwardDate);
            let filters1 = {};

            if (searchInput && searchInput !== "") {
                filters1.pnrNo = { $regex: searchInput, $options: "i" };
            }

            if (onwardDate && onwardDate !== "") {
                filters1.onwardDate = new Date(onwardDate);
            }

            const a2aTicketList = await B2BA2aTicket.aggregate([
                {
                    $match: {
                        isDeleted: false,
                        a2aReference: Types.ObjectId(id),
                        // filters1,
                    },
                }, // match onward date with date from frontend
                {
                    $match: filters1,
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
                    $set: {
                        a2aReference: { $arrayElemAt: ["$a2aReference", 0] },
                        markup: { $arrayElemAt: ["$markup", 0] },
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
                        totalSeats: 1,
                        pnrNo: 1,
                        count: 1,
                        markup: 1,
                        createdAt: 1,
                    },
                },
                {
                    $sort: {
                        createdAt: -1,
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalA2aTicketList: { $sum: 1 },
                        data: { $push: "$$ROOT" },
                    },
                },
                {
                    $project: {
                        totalA2aTicketList: 1,
                        data: {
                            $slice: ["$data", Number(limit) * Number(skip), Number(limit)],
                        },
                    },
                },
            ]);

            res.status(200).json({
                a2aTicketList: a2aTicketList[0]?.data,
                totalA2aTicketList: a2aTicketList[0]?.totalA2aTicketList,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    deleteA2aTicket: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid A2a Ticket  id");
            }

            const b2bA2aTicket = await B2BA2aTicket.findByIdAndUpdate(
                id,
                {
                    isDeleted: true,
                },
                { new: true }
            );

            if (!b2bA2aTicket) {
                return sendErrorResponse(res, 404, "A2a Ticket not found");
            }

            res.status(200).json({
                message: "A2A Ticket successfully deleted",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleA2ATicket: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid A2a Ticket id");
            }

            const b2bA2aTicket = await B2BA2aTicket.findOne({
                _id: id,
                isDeleted: false,
            });
            if (!b2bA2aTicket) {
                return sendErrorResponse(res, 404, "A2a Ticket  not found");
            }

            res.status(200).json(b2bA2aTicket);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateA2aTicket: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid api id");
            }

            const { _, error } = addA2aTicketSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const a2aTicket = await B2BA2aTicket.findOne({ _id: id });

            if (!a2aTicket) {
                return sendErrorResponse(res, 500, "api not found");
            }

            const addedSeats = Number(req.body.totalSeats) - Number(a2aTicket.totalSeats);
            const availableSeats = Number(a2aTicket.availableSeats) + Number(addedSeats);

            await B2BA2aTicket.findByIdAndUpdate(id, {
                ...req.body,
                availableSeats,
            });

            res.status(200).json({
                message: "A2a Ticket successfully updated",
                _id: a2aTicket._id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
