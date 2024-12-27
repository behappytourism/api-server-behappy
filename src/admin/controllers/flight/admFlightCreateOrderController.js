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
} = require("../../../b2b/helpers/b2bFlightHelper");
// const sendInsufficentBalanceMail = require("../../helpers/sendInsufficentBalanceEmail");
const {
    B2BWallet,
    B2BTransaction,
    B2bFlightOrder,
    B2BMarkupProfile,
} = require("../../../b2b/models");
// const B2BFlightOrder = require("../../models/flight/b2bFlightOrder.model");
const {
    availabilitySearchSchema,
    completeBookingSchema,
    inititateFlightBookingSchema,
    addToCartSchema,
    addFlightAncillarySchema,
    fareByDatesSchema,
} = require("../../../b2b/validations/b2bFlightApi.schema");
const { Airport, Airline } = require("../../../models");
// const sendFlightBookingEmail = require("../../../b2b/helpers/flight/sendFlightBookingEmail");
const { updateFlightFareCache, getFlightFareFromCache } = require("../../../config/cache");
const createB2bFlightOrderInvoice = require("../../../b2b/helpers/flight");
const B2BFlightOrder = require("../../../b2b/models/flight/b2bFlightOrder.model");
const { checkWalletBalance, addMoneyToB2bWallet } = require("../../../b2b/utils/wallet");
const sendFlightBookingEmail = require("../../../helpers/flight/sendFlightBookingEmail");
const { B2BFlightOrderRefund, B2BFlightOrderPayment } = require("../../../b2b/models/flight");
// const { checkWalletBalance, deductAmountFromWallet } = require("../../utils/wallet");

module.exports = {
    flightAvailabilitySearch: async (req, res) => {
        try {
            const { trips, travelClass, type } = req.body;

            const { _, error } = availabilitySearchSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const { resellerId } = req.params;

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

            let profileMarkup = await B2BMarkupProfile.findOne({
                resellerId,
            });

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
            if (flightResult?.result[0]) {
                let tempCount = 0;
                for (const trip of flightResult?.result[0]?.trips) {
                    if (
                        (trip?.airlines[0]?.airlineCode === 514 ? type === "oneway" : true) ||
                        trip?.fareDetails?.nf
                    ) {
                        console.log("Saving to cache");
                        updateFlightFareCache({
                            origin: trips[0]?.from,
                            destination: trips[0]?.to,
                            travelClass: travelClass,
                            airlineName: trip?.airlines[0]?.airlineName,
                            airlineCode: trip?.airlines[0]?.airlineCode,
                            flightNumber: "",
                            date: tempCount === 0 ? trips[0]?.departureDate : trips[0]?.returnDate,
                            fare:
                                trip?.airlines[0]?.airlineCode === 514
                                    ? flightResult?.result[0]?.netFare
                                    : trip?.fareDetails?.nf,
                            searchId: flightResult?.searchId,
                            type: tempCount === 0 ? "oneway" : "return",
                            outBoundDate: tempCount === 0 ? null : trips[0]?.departureDate,
                        });
                        tempCount += 1;
                    }
                }
            }

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
            const { tbId, resellerId } = req.params;

            let singleFlightDetails = await getSingleFligthDetails(tbId);

            let profileMarkup = await B2BMarkupProfile.findOne({
                resellerId,
            });

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
            const { tbId, resellerId } = req.params;

            let singleFlightDetails = await getSingleFlightDetailsWithAncillaryRequest(tbId);

            let profileMarkup = await B2BMarkupProfile.findOne({
                resellerId,
            });

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
            console.log(err);
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

            const { resellerId } = req.params;

            const { referenceNumber, booking } = await initateFligthBookingRequest(req.body);

            let profileMarkup = await B2BMarkupProfile.findOne({
                resellerId,
            });

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

            const wallet = await B2BWallet.findOne({ reseller: resellerId });

            const balanceAvailable = checkWalletBalance(wallet, booking?.netFare + b2bMarkupAmount);
            if (!balanceAvailable) {
                return sendErrorResponse(
                    res,
                    400,
                    "Insufficient balance. please reacharge and try again"
                );
            }

            const flightOrder = new B2BFlightOrder({
                reseller: resellerId,
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
                reseller: flightOrder.reseller,
            });

            const flightOrderPayment = await B2BFlightOrderPayment.create({
                amount,
                orderId,
                paymentState: "pending",
                resellerId: flightOrder.reseller,
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
                reseller: flightOrder.reseller,
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
                        resellerId: flightOrder.reseller,
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
};
