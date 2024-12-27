const { isValidObjectId } = require("mongoose");

const { B2bFlightOrder } = require("../../../b2b/models");
const { sendErrorResponse } = require("../../../helpers");
const { flightBookingPdfRequest } = require("../../../b2b/helpers/b2bFlightHelper");
const { Airport, Airline } = require("../../../models");
const { B2BFlightOrderPayment, B2BFlightOrderRefund } = require("../../../b2b/models/flight");

module.exports = {
    getAllFlightBookings: async (req, res) => {
        try {
            const {
                skip = 0,
                limit = 10,
                referenceNumber,
                agentCode,
                departureDateFrom,
                departureDateTo,
                bookingDateFrom,
                bookingDateTo,
                airlineCode,
                fromAirportCode,
                toAirportCode,
                status,
            } = req.query;

            const filters1 = {};
            const filters2 = {};

            if (referenceNumber && referenceNumber !== "") {
                filters1.referenceNumber = referenceNumber;
            }

            if (status && status !== "") {
                filters1.status = status;
            }

            if (
                departureDateFrom &&
                departureDateFrom !== "" &&
                departureDateTo &&
                departureDateTo !== ""
            ) {
                filters1.$and = [
                    {
                        "trips.flightSegments.departureDate": {
                            $gte: new Date(departureDateFrom).toISOString(),
                        },
                    },
                    {
                        "trips.flightSegments.departureDate": {
                            $lte: new Date(departureDateTo).toISOString(),
                        },
                    },
                ];
            } else if (departureDateFrom && departureDateFrom !== "") {
                filters1["trips.flightSegments.departureDate"] = {
                    $gte: new Date(departureDateFrom).toISOString(),
                };
            } else if (departureDateTo && departureDateTo !== "") {
                filters1["trips.flightSegments.departureDate"] = {
                    $lte: new Date(departureDateTo).toISOString(),
                };
            }

            if (
                bookingDateFrom &&
                bookingDateFrom !== "" &&
                bookingDateTo &&
                bookingDateTo !== ""
            ) {
                filters1.$and = [
                    { createdAt: { $gte: new Date(bookingDateFrom)} },
                    { createdAt: { $lte: new Date(bookingDateTo)} },
                ];
            } else if (bookingDateFrom && bookingDateFrom !== "") {
                filters1["createdAt"] = { $gte: new Date(bookingDateFrom) };
            } else if (bookingDateTo && bookingDateTo !== "") {
                filters1["createdAt"] = { $lte: new Date(bookingDateTo) };
            }

            if (airlineCode && airlineCode !== "") {
                filters1["trips.airlines.airlineCode"] = Number(airlineCode);
            }

            if (fromAirportCode && fromAirportCode !== "") {
                filters1["trips.flightSegments.from"] = fromAirportCode;
            }

            if (toAirportCode && toAirportCode !== "") {
                filters1["trips.flightSegments.to"] = toAirportCode;
            }

            if (agentCode && agentCode !== "") {
                filters2["reseller.agentCode"] = agentCode;
            }

            const flightBookings = await B2bFlightOrder.aggregate([
                { $match: filters1 },
                {
                    $lookup: {
                        from: "resellers",
                        localField: "reseller",
                        foreignField: "_id",
                        as: "reseller",
                        pipeline: [{ $project: { agentCode: 1, companyName: 1 } }],
                    },
                },
                {
                    $set: {
                        reseller: { $arrayElemAt: ["$reseller", 0] },
                    },
                },
                { $match: filters2 },
                { $sort: { createdAt: -1 } },
                {
                    $group: {
                        _id: null,
                        totalFlightBookings: { $sum: 1 },
                        data: { $push: "$$ROOT" },
                    },
                },
                {
                    $project: {
                        totalFlightBookings: 1,
                        data: {
                            $slice: ["$data", Number(limit) * Number(skip), Number(limit)],
                        },
                    },
                },
            ]);

            res.status(200).json({
                skip: Number(skip),
                limit: Number(limit),
                flightBookings: flightBookings[0],
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleFlightBookingDetails: async (req, res) => {
        try {
            const { bookingId } = req.params;

            if (!isValidObjectId(bookingId)) {
                return sendErrorResponse(res, 500, "invalid booking id");
            }
            const flightBooking = await B2bFlightOrder.findOne({ _id: bookingId })
                .populate("reseller", "agentCode companyName")
                .lean();
            if (!flightBooking) {
                return sendErrorResponse(res, 404, "flight order not found");
            }

            const payments = await B2BFlightOrderPayment.find({ orderId: bookingId })
                .sort({ createdAt: -1 })
                .lean();
            const refunds = await B2BFlightOrderRefund.find({ orderId: bookingId })
                .sort({ createdAt: -1 })
                .lean();

            res.status(200).json({ flightBooking, payments, refunds });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    downloadSingleFlightTicket: async (req, res) => {
        try {
            const { bookingId } = req.params;

            if (!isValidObjectId(bookingId)) {
                return sendErrorResponse(res, 400, "invalid booking id");
            }
            const booking = await B2bFlightOrder.findOne({
                _id: bookingId,
                status: "completed",
            }).lean();
            if (!booking) {
                return sendErrorResponse(res, 404, "booking not found");
            }

            const pdfData = await flightBookingPdfRequest({
                referenceNumber: booking?.referenceNumber,
                totalMarkup: booking?.adminB2bMarkup || 0,
            });

            res.set({
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename=tickets-${booking?.referenceNumber}.pdf`,
            });
            res.send(pdfData);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getFlightBookingsInitialData: async (req, res) => {
        try {
            const airports = await Airport.find({ isActive: true, isDeleted: false }).lean();
            const airlines = await Airline.find({ isActive: true, isDeleted: false }).lean();

            res.status(200).json({ airports, airlines });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
