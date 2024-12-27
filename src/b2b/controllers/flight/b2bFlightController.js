const { isValidObjectId, Types } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const {
    flightAvailabilitySearchRequest,
    getSingleFlightDetailsWithAncillaryRequest,
    addSelectedAncillariesRequest,
    initateFligthBookingRequest,
    completeFligthBookingRequest,
    addToCartRequest,
    flightBookingPdfRequest,
    getSingleFligthDetails,
} = require("../../helpers/b2bFlightHelper");
const sendInsufficentBalanceMail = require("../../helpers/sendInsufficentBalanceEmail");
const { B2BWallet, B2BTransaction, B2bFlightOrder, B2BMarkupProfile } = require("../../models");
const B2BFlightOrder = require("../../models/flight/b2bFlightOrder.model");
const {
    availabilitySearchSchema,
    completeBookingSchema,
    inititateFlightBookingSchema,
    addToCartSchema,
    addFlightAncillarySchema,
    fareByDatesSchema,
} = require("../../validations/b2bFlightApi.schema");
const { Airport, Airline } = require("../../../models");
const sendFlightBookingEmail = require("../../../helpers/flight/sendFlightBookingEmail");
const { updateFlightFareCache, getFlightFareFromCache } = require("../../../config/cache");
const createB2bFlightOrderInvoice = require("../../helpers/flight");
const {
    checkWalletBalance,
    deductAmountFromWallet,
    addMoneyToB2bWallet,
} = require("../../utils/wallet");
const { B2BFlightOrderPayment, B2BFlightOrderRefund } = require("../../models/flight");

module.exports = {
    flightAvailabilitySearch: async (req, res) => {
        try {
            const { trips, travelClass, type } = req.body;

            const { _, error } = availabilitySearchSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const flightResult = await flightAvailabilitySearchRequest(req.body);

            const filters = {
                airports: [],
                stops: [],
                airlines: [],
                minFare: 0,
                maxFare: 0,
                minTripDuration: 0,
                maxTripDuration: 0,
                layOverDuration: 0,
                cheapestFlight: {
                    fare: 0,
                    duration: 0,
                },
                fastestFlight: {
                    fare: 0,
                    duration: 0,
                },
            };

            let profileMarkup;
            if (req.reseller.role === "reseller") {
                profileMarkup = await B2BMarkupProfile.findOne({
                    resellerId: req.reseller?._id,
                });
            } else {
                profileMarkup = await B2BMarkupProfile.findOne({
                    resellerId: req.reseller?.referredBy,
                });
            }

            for (let i = 0; i < flightResult?.result?.length; i++) {
                let result = flightResult?.result[i];
                // adding markup
                let b2bMarkupAmount = 0;
                if (profileMarkup) {
                    const b2bMarkup = profileMarkup?.flight?.find(
                        (item) =>
                            item?.airlineCode?.toString() ===
                            result?.trips[0]?.flightSegments[0]?.airlineCode?.toString()
                    );
                    if (b2bMarkup) {
                        if (b2bMarkup.markupType === "flat") {
                            b2bMarkupAmount = b2bMarkup.markup;
                        } else {
                            b2bMarkupAmount = (result?.netFare / 100) * b2bMarkup.markup;
                        }
                    }

                    flightResult.result[i].netFare += b2bMarkupAmount;
                    flightResult.result[i].totalFee += b2bMarkupAmount;

                    for (let j = 0; j < flightResult.result[i]?.fares?.length; j++) {
                        let fare = flightResult.result[i]?.fares[j];
                        let tempB2bMarkupAmount = 0;
                        if (b2bMarkup) {
                            if (b2bMarkup.markupType === "flat") {
                                tempB2bMarkupAmount = b2bMarkup.markup;
                            } else {
                                tempB2bMarkupAmount = (fare?.netFare / 100) * b2bMarkup.markup;
                            }
                        }
                        flightResult.result[i].fares[j].netFare += tempB2bMarkupAmount;
                        flightResult.result[i].fares[j].totalFee += tempB2bMarkupAmount;
                    }
                }

                for (let j = 0; j < result?.trips?.length; j++) {
                    let trip = result?.trips[j];

                    for (let k = 0; k < trip?.flightSegments?.length; k++) {
                        const segment = trip?.flightSegments[k];
                        const fromAirport = filters.airports?.find(
                            (item) => item?.airportCode === segment?.from
                        );
                        const toAirport = filters.airports?.find(
                            (item) => item?.airportCode === segment?.to
                        );
                        if (!fromAirport) {
                            filters.airports?.push({
                                airportCode: segment?.from,
                                airportName: segment?.fromAirport,
                                airportPlace: segment?.fromPlace,
                            });
                        }
                        if (!toAirport) {
                            filters.airports?.push({
                                airportCode: segment?.to,
                                airportName: segment?.toAirport,
                                airportPlace: segment?.toPlace,
                            });
                        }

                        const airlineIndex = filters.airlines?.findIndex(
                            (item) => item?.airlineCode === segment?.airlineCode
                        );
                        if (airlineIndex === -1) {
                            filters.airlines?.push({
                                airlineCode: segment?.airlineCode,
                                airlineName: segment?.airlineName,
                                fare: result?.netFare,
                            });
                        } else {
                            if (filters.airlines[airlineIndex].fare > result?.netFare) {
                                filters.airlines[airlineIndex].fare = result?.netFare;
                            }
                        }
                    }

                    if (i === 0 && j === 0) {
                        filters.minTripDuration = trip?.totalDuration;
                        filters.maxTripDuration = trip?.totalDuration;
                    } else {
                        if (filters.minTripDuration > trip?.totalDuration) {
                            filters.minTripDuration = trip?.totalDuration;
                        }
                        if (filters.maxTripDuration < trip?.totalDuration) {
                            filters.maxTripDuration = trip?.totalDuration;
                        }
                    }

                    for (let k = 0; k < trip?.layOverDurations?.length; k++) {
                        if (filters.layOverDuration < trip?.layOverDurations[k]) {
                            filters.layOverDuration = trip?.layOverDurations[k];
                        }
                    }

                    if (trip?.flightSegments?.length === 1) {
                        const stopObjIndex = filters.stops?.findIndex((item) => {
                            return item?.id === "nonstop";
                        });
                        if (stopObjIndex === -1) {
                            filters.stops.push({
                                id: 0,
                                name: "Non Stop",
                                fare: result.netFare,
                            });
                        } else {
                            if (filters.stops[stopObjIndex]?.fare > result?.netFare) {
                                filters.stops[stopObjIndex].fare = result?.netFare;
                            }
                        }
                    } else if (trip?.flightSegments?.length === 2) {
                        const stopObjIndex = filters.stops?.findIndex((item) => {
                            return item?.id === "1stop";
                        });
                        if (stopObjIndex === -1) {
                            filters.stops.push({
                                id: 1,
                                name: "1 Stop",
                                fare: result.netFare,
                            });
                        } else {
                            if (filters.stops[stopObjIndex]?.fare > result?.netFare) {
                                filters.stops[stopObjIndex].fare = result?.netFare;
                            }
                        }
                    } else if (trip?.flightSegments?.length > 2) {
                        const stopObjIndex = filters.stops?.findIndex((item) => {
                            return item?.id === "1+stop";
                        });
                        if (stopObjIndex === -1) {
                            filters.stops.push({
                                id: 2,
                                name: "2 & more",
                                fare: result.netFare,
                            });
                        } else {
                            if (filters.stops[stopObjIndex]?.fare > result?.netFare) {
                                filters.stops[stopObjIndex].fare = result?.netFare;
                            }
                        }
                    }
                }

                if (i === 0) {
                    filters.minFare = result?.netFare;
                    filters.maxFare = result?.netFare;
                    filters.cheapestFlight = {
                        fare: result?.netFare,
                        duration: result?.totalDuration,
                    };
                    filters.fastestFlight = {
                        fare: result?.netFare,
                        duration: result?.totalDuration,
                    };
                } else {
                    if (filters.minFare > result?.netFare) {
                        filters.minFare = result?.netFare;
                    }
                    if (filters.maxFare < result?.netFare) {
                        filters.maxFare = result?.netFare;
                    }
                    if (filters.cheapestFlight?.fare > result?.netFare) {
                        filters.cheapestFlight = {
                            fare: result?.netFare,
                            duration: result?.totalDuration,
                        };
                    }
                    if (filters.fastestFlight?.duration > result?.totalDuration) {
                        filters.fastestFlight = {
                            fare: result?.netFare,
                            duration: result?.totalDuration,
                        };
                    }
                }
            }

            filters.stops = filters.stops?.sort((a, b) => a.fare - b.fare);

            // caching lowest fare value
            // if (flightResult?.result[0]) {
            //     let tempCount = 0;
            //     for (const trip of flightResult?.result[0]?.trips) {
            //         console.log(trip, "trips");
            //         if (
            //             (trip?.airlines[0]?.airlineCode === 514 ? type === "oneway" : true) ||
            //             trip?.fareDetails?.nf
            //         ) {
            //             console.log("Saving to cache");
            //             updateFlightFareCache({
            //                 origin: trips[0]?.from,
            //                 destination: trips[0]?.to,
            //                 travelClass: travelClass,
            //                 airlineName: trip?.airlines[0]?.airlineName,
            //                 airlineCode: trip?.airlines[0]?.airlineCode,
            //                 flightNumber: "",
            //                 date: tempCount === 0 ? trips[0]?.departureDate : trips[0]?.returnDate,
            //                 fare:
            //                     trip?.airlines[0]?.airlineCode === 514
            //                         ? flightResult?.result[0]?.netFare
            //                         : trip?.fareDetails?.nf,
            //                 searchId: flightResult?.searchId,
            //                 type: tempCount === 0 ? "oneway" : "return",
            //                 outBoundDate: tempCount === 0 ? null : trips[0]?.departureDate,
            //             });
            //             tempCount += 1;
            //         }
            //     }
            // }

            res.status(200).json({
                totalSearchResults: flightResult?.result?.length || 0,
                filters,
                flightResult,
            });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    addToCartFlight: async (req, res) => {
        try {
            const { _, error } = addToCartSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            let addToCart = await addToCartRequest(req.body);
            res.status(200).json(addToCart);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleFlightDetails: async (req, res) => {
        try {
            const { tbId } = req.params;

            let singleFlightDetails = await getSingleFligthDetails(tbId);

            let profileMarkup;
            if (req.reseller.role === "reseller") {
                profileMarkup = await B2BMarkupProfile.findOne({
                    resellerId: req.reseller?._id,
                });
            } else {
                profileMarkup = await B2BMarkupProfile.findOne({
                    resellerId: req.reseller?.referredBy,
                });
            }

            let b2bMarkupAmount = 0;
            if (profileMarkup) {
                const b2bMarkup = profileMarkup?.flight?.find(
                    (item) =>
                        item?.airlineCode?.toString() ===
                        singleFlightDetails?.trips[0]?.flightSegments[0]?.airlineCode?.toString()
                );
                if (b2bMarkup) {
                    if (b2bMarkup.markupType === "flat") {
                        b2bMarkupAmount = b2bMarkup.markup;
                    } else {
                        b2bMarkupAmount = (singleFlightDetails?.netFare / 100) * b2bMarkup.markup;
                    }
                }
            }

            singleFlightDetails.netFare += b2bMarkupAmount;
            singleFlightDetails.totalFee += b2bMarkupAmount;

            res.status(200).json(singleFlightDetails);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleFlightDetailsWithAncillary: async (req, res) => {
        try {
            const { tbId } = req.params;

            let singleFlightDetails = await getSingleFlightDetailsWithAncillaryRequest(tbId);

            let profileMarkup;
            if (req.reseller.role === "reseller") {
                profileMarkup = await B2BMarkupProfile.findOne({
                    resellerId: req.reseller?._id,
                });
            } else {
                profileMarkup = await B2BMarkupProfile.findOne({
                    resellerId: req.reseller?.referredBy,
                });
            }

            let baggageSsr = singleFlightDetails?.baggageSsr || [];
            let mealsSsr = singleFlightDetails?.mealsSsr || [];
            let seatSsr = singleFlightDetails?.seatSsr || [];
            let b2bMarkupAmount = 0;
            if (profileMarkup) {
                const b2bMarkup = profileMarkup?.flight?.find(
                    (item) =>
                        item?.airlineCode?.toString() ===
                        singleFlightDetails.priceQuoteResponse?.trips[0]?.flightSegments[0]?.airlineCode?.toString()
                );
                if (b2bMarkup) {
                    if (b2bMarkup.markupType === "flat") {
                        b2bMarkupAmount = b2bMarkup.markup;
                    } else {
                        b2bMarkupAmount =
                            (singleFlightDetails.priceQuoteResponse?.netFare / 100) *
                            b2bMarkup.markup;

                        if (baggageSsr?.length) {
                            for (let i = 0; i < baggageSsr?.length; i++) {
                                baggageSsr[i].baggages = baggageSsr[i]?.baggages?.map((item) => {
                                    return {
                                        ...item,
                                        price: item?.price + (item?.price / 100) * b2bMarkup.markup,
                                    };
                                });
                            }
                        }
                        if (mealsSsr?.length) {
                            for (let i = 0; i < mealsSsr?.length; i++) {
                                mealsSsr[i].meals = mealsSsr[i]?.meals?.map((item) => {
                                    return {
                                        ...item,
                                        price: item?.price + (item?.price / 100) * b2bMarkup.markup,
                                    };
                                });
                            }
                        }
                        if (seatSsr?.length) {
                            for (let i = 0; i < seatSsr?.length; i++) {
                                seatSsr[i].seatMap = seatSsr[i]?.seatMap?.map((seatMap) => {
                                    return {
                                        ...seatMap,
                                        rows: seatMap?.rows?.map((row) => {
                                            return {
                                                ...row,
                                                seats: row?.seats?.map((seat) => {
                                                    return {
                                                        ...seat,
                                                        price:
                                                            seat?.price +
                                                            (seat?.price / 100) * b2bMarkup.markup,
                                                    };
                                                }),
                                            };
                                        }),
                                    };
                                });
                            }
                        }
                    }
                }
            }

            singleFlightDetails.priceQuoteResponse.netFare += b2bMarkupAmount;
            singleFlightDetails.priceQuoteResponse.totalFee += b2bMarkupAmount;

            res.status(200).json(singleFlightDetails);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    addSelectedAncillaries: async (req, res) => {
        try {
            const { _, error } = addFlightAncillarySchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const response = await addSelectedAncillariesRequest(req.body);
            res.status(200).json(response);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    initiateFlightBooking: async (req, res) => {
        try {
            const { _, error } = inititateFlightBookingSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const { referenceNumber, booking } = await initateFligthBookingRequest(req.body);

            let profileMarkup;
            if (req.reseller.role === "reseller") {
                profileMarkup = await B2BMarkupProfile.findOne({
                    resellerId: req.reseller?._id,
                });
            } else {
                profileMarkup = await B2BMarkupProfile.findOne({
                    resellerId: req.reseller?.referredBy,
                });
            }

            let b2bMarkupAmount = 0;
            if (profileMarkup) {
                const b2bMarkup = profileMarkup?.flight?.find(
                    (item) =>
                        item?.airlineCode?.toString() ===
                        booking?.trips[0]?.flightSegments[0]?.airlineCode?.toString()
                );
                if (b2bMarkup) {
                    if (b2bMarkup.markupType === "flat") {
                        b2bMarkupAmount = b2bMarkup.markup;
                    } else {
                        b2bMarkupAmount = (booking?.netFare / 100) * b2bMarkup.markup;
                    }
                }
            }

            const wallet = await B2BWallet.findOne({ reseller: req.reseller?._id });

            const balanceAvailable = checkWalletBalance(wallet, booking?.netFare + b2bMarkupAmount);
            if (!balanceAvailable) {
                return sendErrorResponse(
                    res,
                    400,
                    "Insufficient balance. please reacharge and try again"
                );
            }

            const flightOrder = new B2BFlightOrder({
                reseller: req.reseller._id,
                noOfAdults: booking?.noOfAdults,
                noOfChildren: booking?.noOfChildren,
                noOfInfants: booking?.noOfInfants,
                totalPassengers: booking?.totalPassengers,
                contactDetails: booking.contactDetails,
                passengers: booking.passengers,
                ancillaries: booking?.ancillaries,
                trips: booking?.trips,
                netFare: booking?.netFare + b2bMarkupAmount,
                baseFare: booking?.baseFare,
                totalTax: booking?.totalTax,
                totalFee: booking?.totalFee + b2bMarkupAmount,
                adminB2bMarkup: b2bMarkupAmount,
                clientMarkup: 0,
                subAgentMarkup: 0,
                currency: booking?.currency,
                paymentState: "non-paid",
                status: "pending",
                otp: 12345,
                identifierToken: booking?.identifierToken,
                referenceNumber,
                tripType: booking?.tripType,
                // referenceNumber: generateUniqueString("B2BFLT"),
            });

            await flightOrder.save();

            res.status(200).json({
                message: "flight order has been initated",
                flightOrderId: flightOrder._id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    completeFlightBooking: async (req, res) => {
        try {
            const { orderId, otp } = req.body;

            const { _, error } = completeBookingSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }
            const flightOrder = await B2BFlightOrder.findOne({
                _id: orderId,
                reseller: req.reseller._id,
            });
            if (!flightOrder) {
                return sendErrorResponse(res, 400, "order not found");
            }

            if (flightOrder.status === "completed") {
                return sendErrorResponse(res, 400, "sorry, you have already completed this order!");
            }
            if (!Number(flightOrder.otp) || Number(flightOrder.otp) !== Number(otp)) {
                return sendErrorResponse(res, 400, "incorrect otp!");
            }

            let amount = flightOrder.netFare;

            let wallet = await B2BWallet.findOne({
                reseller: req.reseller?._id,
            });

            const flightOrderPayment = await B2BFlightOrderPayment.create({
                amount,
                orderId,
                paymentState: "pending",
                resellerId: req.reseller?._id,
                paymentMethod: "wallet",
                paymentStateMessage: "",
            });

            try {
                await deductAmountFromWallet(wallet, amount);
            } catch (err) {
                flightOrderPayment.paymentState = "failed";
                await flightOrderPayment.save();

                return sendErrorResponse(res, 400, "wallet deduction failed, please try again");
            }

            flightOrderPayment.paymentState = "success";
            await flightOrderPayment.save();

            await B2BTransaction.create({
                reseller: req.reseller?._id,
                paymentProcessor: "wallet",
                product: "airline",
                processId: orderId,
                description: `Airline booking payment`,
                debitAmount: amount,
                creditAmount: 0,
                directAmount: 0,
                closingBalance: wallet.balance,
                dueAmount: wallet.creditUsed,
                remark: "Airline booking payment",
                dateTime: new Date(),
            });

            const refundPaidAmount = async () => {
                let flightOrderRefund;
                try {
                    const flightOrderRefund = await B2BFlightOrderRefund.create({
                        amount,
                        resellerId: req.reseller?._id,
                        paymentMethod: "wallet",
                        orderId,
                        note: "",
                        status: "pending",
                    });
                    await addMoneyToB2bWallet(wallet, amount);
                    flightOrderRefund.status = "success";
                    await flightOrderRefund.save();

                    await B2BTransaction.create({
                        reseller: req.reseller?._id,
                        paymentProcessor: "wallet",
                        product: "airline",
                        processId: orderId,
                        description: `Airline booking refund`,
                        debitAmount: 0,
                        creditAmount: amount,
                        directAmount: 0,
                        closingBalance: wallet.balance,
                        dueAmount: wallet.creditUsed,
                        remark: "Airline booking refund",
                        dateTime: new Date(),
                    });
                } catch (err) {
                    if (flightOrderRefund) {
                        flightOrderRefund.status = "failed";
                        await flightOrderRefund.save();
                    }
                    return sendErrorResponse(
                        res,
                        400,
                        "something went wrong on flight order refund"
                    );
                }
            };

            let booking;
            try {
                const response = await completeFligthBookingRequest({
                    referenceNumber: flightOrder?.referenceNumber,
                });
                booking = response?.booking;
            } catch (err) {
                await refundPaidAmount();
                throw err;
            }

            flightOrder.status = "completed";
            flightOrder.paymentState = "fully-paid";
            flightOrder.bookingPNR = booking.bookingPNR;
            flightOrder.trips = booking.trips;
            await flightOrder.save();

            sendFlightBookingEmail({ flightOrder });

            res.status(200).json({
                message: "order creation success",
                flightOrder: flightOrder._id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleBookingDetails: async (req, res) => {
        try {
            const { bookingId } = req.params;

            if (!isValidObjectId(bookingId)) {
                return sendErrorResponse(res, 400, "invalid booking id");
            }
            const flightOrder = await B2BFlightOrder.findOne({
                _id: bookingId,
                reseller: req.reseller._id,
            });
            if (!flightOrder) {
                return sendErrorResponse(res, 400, "order not found");
            }

            res.status(200).json(flightOrder);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    downloadSingleBookingTicket: async (req, res) => {
        try {
            const { bookingId } = req.params;

            if (!isValidObjectId(bookingId)) {
                return sendErrorResponse(res, 400, "invalid booking id");
            }

            const flightOrder = await B2BFlightOrder.findOne({
                _id: bookingId,
                reseller: req.reseller._id,
                status: "completed",
            })
                .select("referenceNumber adminB2bMarkup")
                .lean();

            if (!flightOrder) {
                return sendErrorResponse(res, 400, "order not found");
            }

            const pdfData = await flightBookingPdfRequest({
                referenceNumber: flightOrder?.referenceNumber,
                totalMarkup: flightOrder?.adminB2bMarkup || 0,
                reseller: req.reseller,
            });

            res.set({
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename=tickets-${flightOrder?.referenceNumber}.pdf`,
            });
            res.send(pdfData);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllFlightBookingDetails: async (req, res) => {
        try {
            const {
                skip = 0,
                limit = 10,
                referenceNumber,
                departureDateFrom,
                departureDateTo,
                bookingDateFrom,
                bookingDateTo,
                airlineCode,
                fromAirportCode,
                toAirportCode,
                status,
            } = req.query;

            const filters1 = {
                reseller: Types.ObjectId(req.reseller?._id),
            };

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
                    { createdAt: { $gte: new Date(bookingDateFrom).toISOString() } },
                    { createdAt: { $lte: new Date(bookingDateTo).toISOString() } },
                ];
            } else if (bookingDateFrom && bookingDateFrom !== "") {
                filters1["createdAt"] = { $gte: new Date(bookingDateFrom).toISOString() };
            } else if (bookingDateTo && bookingDateTo !== "") {
                filters1["createdAt"] = { $lte: new Date(bookingDateTo).toISOString() };
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

            const flightBookings = await B2bFlightOrder.aggregate([
                { $match: filters1 },
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
                flightBookings: flightBookings[0] || {
                    _id: null,
                    totalFlightBookings: 0,
                    data: [],
                },
            });
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

    getFlightFaresByDates: async (req, res) => {
        try {
            const { origin, destination, travelClass, startDate, endDate, type, outBoundDate } =
                req.query;

            const { error } = fareByDatesSchema.validate(req.query);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            const result = await getFlightFareFromCache({
                origin,
                destination,
                travelClass,
                startDate,
                endDate,
                type,
                outBoundDate,
            });

            res.status(200).json({
                origin,
                destination,
                startDate,
                endDate,
                result,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    downloadFlightBookingInvoice: async (req, res) => {
        try {
            const { bookingId } = req.params;

            if (!isValidObjectId(bookingId)) {
                return sendErrorResponse(res, 400, "invalid booking id");
            }
            const flightOrder = await B2BFlightOrder.findOne({
                _id: bookingId,
                reseller: req.reseller._id,
                status: "completed",
            })
                .populate({
                    path: "reseller",
                    populate: { path: "country" },
                    select: "companyName address country agentCode email",
                })
                .lean();
            if (!flightOrder) {
                return sendErrorResponse(res, 400, "order not found");
            }

            const pdfData = await createB2bFlightOrderInvoice({
                flightOrder,
            });

            res.set({
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename=invoice.pdf`,
            });
            res.send(pdfData);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
