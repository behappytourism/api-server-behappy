const { isValidObjectId, Types } = require("mongoose");
const { saveTicket, getTicketType, getTimeSlotWithRate } = require("../../../b2b/helpers");
const createMultipleTicketPdfTheme2 = require("../../../b2b/helpers/attraction/createMultipleTicketTheme2");
const createBookingTicketPdfTheme2 = require("../../../b2b/helpers/attraction/styles/createBookingTicketPdfTheme2");
const createBookingTicketPdf = require("../../../b2b/helpers/bookingTicketsHelper");
const createDubaiParkOrder = require("../../../b2b/helpers/createDubaiParkOrder");
const createMultipleTicketPdf = require("../../../b2b/helpers/multipleTicketHelper");
const sendAttractionOrderAdminEmail = require("../../../b2b/helpers/sendAttractionOrderAdminEmail");
const sendAttractionOrderEmail = require("../../../b2b/helpers/sendAttractionOrderEmail");
const {
    B2BMarkupProfile,
    Reseller,
    B2BAttractionOrder,
    B2BWallet,
    B2BTransaction,
} = require("../../../b2b/models");
const { checkWalletBalance, deductAmountFromWallet } = require("../../../b2b/utils/wallet");
const { b2bAttractionOrderSchema } = require("../../../b2b/validations/b2bAttractionOrder.schema");
const { b2bTimeSlotSchema } = require("../../../b2b/validations/b2bTimeSlot.schema");

const { sendErrorResponse, sendMobileOtp } = require("../../../helpers");
const {
    Attraction,
    AttractionCategory,
    AttractionActivity,
    Destination,
    AttractionReview,
    Visa,
    Country,
    VisaNationality,
    ExcursionTicketPricing,
    ExcursionTransferPricing,
    Excursion,
    AttractionTicket,
    AttractionTransaction,
    AttractionTicketSetting,
} = require("../../../models");
const { generateUniqueString } = require("../../../utils");
const {
    getAttractionTransaction,
    generateAttractionTransactionsSheet,
} = require("../../helpers/attraction/attractionTranscationHelper");
const { confirmTicket, getTimeSlotWithRates } = require("../../helpers/burjKhalifaApiHelper");
const { MarketStrategy } = require("../../models");
const MarkupProfile = require("../../models/markupProfile.model");
const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

module.exports = {
    getAllAttractions: async (req, res) => {
        try {
            const attractions = await Attraction.find({ isDeleted: false, isActive: true }).select(
                "title "
            );

            if (!attractions) {
                return sendErrorResponse(res, 400, "attractions not found!");
            }

            return res.status(200).json(attractions);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
    getResellers: async (req, res) => {
        try {
            const resellers = await Reseller.find({
                isDeleted: false,
                status: "OK",
                role: "reseller",
            }).select("companyName agentCode");

            if (!resellers) {
                return sendErrorResponse(res, 400, "resellers not found!");
            }
            return res.status(200).json(resellers);
        } catch (err) {}
    },
    getAllActivities: async (req, res) => {
        try {
            const { id } = req.params;

            const activities = await AttractionActivity.find({
                isDeleted: false,
                isActive: true,
                attraction: id,
            }).select("name");

            if (!activities) {
                return sendErrorResponse(res, 400, "activities not found!");
            }

            return res.status(200).json(activities);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleActivityDetails: async (req, res) => {
        try {
            const { id, resellerId } = req.params;

            const reseller = await Reseller.findOne({ isDeleted: false, _id: resellerId }).populate(
                "marketStrategy"
            );
            if (!reseller) {
                return sendErrorResponse(res, 400, "reseller not found!");
            }

            const activity = await AttractionActivity.findOne({
                isDeleted: false,
                isActive: true,
                _id: id,
            })
                .populate("attraction")
                .lean();

            if (!activity) {
                return sendErrorResponse(res, 400, "activities not found!");
            }

            const profileMarkup = await B2BMarkupProfile.findOne({ resellerId: reseller._id });
            let {
                adultCost,
                childCost,
                infantCost,
                hourlyCost,
                sharedTransferPrice,

                privateTransfers,
                isB2bPromoCode,
                b2bPromoAmountAdult,
            } = activity;

            let privateTransfer;

            const marketMarkup = await reseller?.marketStrategy?.activities?.find(
                (markup) => markup?.activity?.toString() === activity?._id.toString()
            );

            if (marketMarkup) {
                if (marketMarkup?.markupType === "percentage") {
                    const markupAmount = marketMarkup?.markup / 100;
                    if (activity.base === "hourly") {
                        hourlyCost *= 1 + markupAmount;
                    } else {
                        adultCost *= 1 + markupAmount;
                        if (childCost) {
                            childCost *= 1 + markupAmount;
                        }
                        if (infantCost) {
                            infantCost *= 1 + markupAmount;
                        }
                    }
                } else if (marketMarkup.markupType === "flat") {
                    if (activity.base === "hourly") {
                        hourlyCost += marketMarkup?.markup;
                    } else {
                        adultCost += marketMarkup?.markup;
                        if (childCost) {
                            childCost += marketMarkup.markup;
                        }
                        if (infantCost) {
                            infantCost += marketMarkup.markup;
                        }
                    }
                }
            }

            if (marketMarkup?.transferMarkupType === "percentage") {
                if (activity.activityType == "transfer") {
                    const transferMarkupAmount = marketMarkup?.transferMarkup / 100;

                    if (activity?.isSharedTransferAvailable == true) {
                        sharedTransferPrice *= 1 + transferMarkupAmount;
                    }
                    if (activity?.isPrivateTransferAvailable == true) {
                        privateTransfer *= 1 + transferMarkupAmount;

                        privateTransfers = privateTransfers?.map((pvtTranf) => {
                            return {
                                ...pvtTranf,
                                price: pvtTranf?.price + pvtTranf?.price * transferMarkupAmount,
                            };
                        });
                    }
                }
            } else if (marketMarkup?.transferMarkupType === "flat") {
                if (activity.activityType == "transfer") {
                    if (activity.isSharedTransferAvailable == true) {
                        sharedTransferPrice += marketMarkup?.transferMarkup;
                    }
                    if (activity?.isPrivateTransferAvailable == true) {
                        privateTransfer += marketMarkup?.transferMarkup;

                        privateTransfers = privateTransfers?.map((pvtTranf) => {
                            return {
                                ...pvtTranf,
                                price: pvtTranf?.price + marketMarkup?.transferMarkup,
                            };
                        });
                    }
                }
            }

            const markup = await profileMarkup?.activities.find(
                (markup) => markup?.activity?.toString() === activity?._id.toString()
            );

            if (markup) {
                if (markup.markupType === "percentage") {
                    const markupAmount = markup.markup / 100;
                    if (activity.base === "hourly") {
                        hourlyCost *= 1 + markupAmount;
                    } else {
                        adultCost *= 1 + markupAmount;
                        if (childCost) {
                            childCost *= 1 + markupAmount;
                        }
                        if (infantCost) {
                            infantCost *= 1 + markupAmount;
                        }
                        if (activity.activityType == "transfer") {
                            if (activity.isSharedTransferAvailable == true) {
                                sharedTransferPrice *= 1 + markupAmount;
                            }
                            if (activity.isPrivateTransferAvailable == true) {
                                privateTransfer *= 1 + markupAmount;

                                privateTransfers = privateTransfers.map((pvtTranf) => {
                                    return {
                                        ...pvtTranf,
                                        price: pvtTranf.price + pvtTranf.price * markupAmount,
                                    };
                                });
                            }
                        }
                    }
                } else if (markup.markupType === "flat") {
                    if (activity.base === "hourly") {
                        hourlyCost += markup?.markup;
                    } else {
                        adultCost += markup?.markup;
                        if (childCost) {
                            childCost += markup.markup;
                        }
                        if (infantCost) {
                            infantCost += markup.markup;
                        }

                        if (activity.activityType == "transfer") {
                            if (activity?.isSharedTransferAvailable == true) {
                                sharedTransferPrice += markup.markup;
                            }
                            if (activity?.isPrivateTransferAvailable == true) {
                                privateTransfer += markup?.markup;

                                privateTransfers = privateTransfers?.map((pvtTranf) => {
                                    return {
                                        ...pvtTranf,
                                        price: pvtTranf?.price + markup?.markup,
                                    };
                                });
                            }
                        }
                    }
                }
            }

            let lowPrice;

            if (activity.activityType === "normal") {
                if (activity.base === "hourly") {
                    lowPrice = hourlyCost;
                } else {
                    lowPrice = adultCost;
                }
            } else if (activity.activityType === "transfer") {
                if (activity.isSharedTransferAvailable === true) {
                    lowPrice = sharedTransferPrice;
                } else {
                    lowPrice = privateTransfer;
                }
            }

            activity.lowPrice = lowPrice;
            activity.adultPrice = adultCost || 0;
            activity.childPrice = childCost || 0;
            activity.infantPrice = infantCost || 0;
            activity.hourlyPrice = hourlyCost || 0;
            activity.sharedTransferPrice = sharedTransferPrice || 0;
            activity.privateTransfer = privateTransfer;
            activity.privateTransfers = privateTransfers;

            res.status(200).json(activity);
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    getTimeSlot: async (req, res) => {
        try {
            const { productId, productCode, timeSlotDate, activityId } = req.body;

            const { resellerId } = req.params;

            if (!isValidObjectId(resellerId)) {
                return sendErrorResponse(res, 400, "invalid resellerId");
            }

            const reseller = await Reseller.findOne({ _id: resellerId });

            if (!reseller) {
                return sendErrorResponse(res, 500, "reseller not found!");
            }

            const { error } = b2bTimeSlotSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(activityId)) {
                return sendErrorResponse(res, 400, "invalid activity id");
            }
            let activity = await AttractionActivity.findOne({
                isDeleted: false,
                productId,
                productCode,
                _id: activityId,
            });
            if (!activity) {
                return sendErrorResponse(res, 404, "activity not found");
            }

            let timeSlotsRate = await getTimeSlotWithRate(productId, productCode, timeSlotDate);

            let market = await MarketStrategy.findOne({ _id: reseller?.marketStrategy });

            let b2bMarkupProfile = await B2BMarkupProfile.findOne({ resellerId });

            let markup = b2bMarkupProfile?.activities.find(
                (markup) => markup?.activity?.toString() === activity?._id.toString()
            );

            let marketMarkup = market?.activities.find(
                (markup) => markup?.activity?.toString() == activity?._id.toString()
            );

            let timeSlots = timeSlotsRate?.map((timeSlot) => {
                let { AdultPrice, ChildPrice } = timeSlot;

                AdultPrice = Number(AdultPrice);
                ChildPrice = Number(ChildPrice);

                if (marketMarkup) {
                    if (marketMarkup.markupType === "percentage") {
                        const markupAmount = marketMarkup?.markup / 100;
                        AdultPrice *= 1 + Number(markupAmount);
                        if (ChildPrice !== null && ChildPrice !== 0) {
                            ChildPrice *= 1 + Number(markupAmount);
                        }
                    } else if (marketMarkup?.markupType === "flat") {
                        AdultPrice += Number(marketMarkup?.markup);
                        if (ChildPrice !== null && ChildPrice !== 0) {
                            ChildPrice += Number(marketMarkup?.markup);
                        }
                    }
                }

                if (markup) {
                    if (markup.markupType === "percentage") {
                        const markupAmount = markup.markup / 100;
                        AdultPrice *= 1 + Number(markupAmount);
                        if (ChildPrice !== null && ChildPrice !== 0) {
                            ChildPrice *= 1 + Number(markupAmount);
                        }
                    } else if (markup.markupType === "flat") {
                        AdultPrice += Number(markup.markup);
                        if (ChildPrice !== null && ChildPrice !== 0) {
                            ChildPrice += Number(markup.markup);
                        }
                    }
                }

                return {
                    ...timeSlot,
                    AdultPrice,
                    ChildPrice,
                };
            });

            res.status(200).json(timeSlots);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    createAttractionOrder: async (req, res) => {
        try {
            const {
                selectedActivities,
                country,
                name,
                email,
                phoneNumber,
                agentReferenceNumber,
                type,
            } = req.body;

            const { resellerId } = req.params;

            const { _, error } = b2bAttractionOrderSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(country)) {
                return sendErrorResponse(res, 400, "invalid country id");
            }

            const reseller = await Reseller.findOne({ _id: resellerId });
            if (!reseller) {
                return sendErrorResponse(res, 500, "reseller not found!");
            }

            const countryDetail = await Country.findOne({
                isDeleted: false,
                _id: country,
            });
            if (!countryDetail) {
                return sendErrorResponse(res, 404, "country not found");
            }

            const exAttractionOrder = await B2BAttractionOrder.findOne({
                agentReferenceNumber: agentReferenceNumber?.toLowerCase(),
                reseller: resellerId,
            });
            if (exAttractionOrder) {
                return sendErrorResponse(
                    res,
                    400,
                    "already an attraction order exists with this reference number"
                );
            }

            let totalAmount = 0;
            for (let i = 0; i < selectedActivities?.length; i++) {
                if (!isValidObjectId(selectedActivities[i]?.activity)) {
                    return sendErrorResponse(res, 400, "Invalid activity id");
                }

                let specialB2bMarkup;
                let profileMarkup;
                let market;
                let marketMarkup;
                const activity = await AttractionActivity.findOne({
                    _id: selectedActivities[i]?.activity,
                    isDeleted: false,
                });
                if (!activity) {
                    return sendErrorResponse(res, 400, "Activity not found!");
                }

                const attraction = await Attraction.findOne({
                    _id: activity.attraction,
                    isDeleted: false,
                    isActive: true,
                });
                if (!attraction) {
                    return sendErrorResponse(res, 500, "attraction not found!");
                }

                market = await MarketStrategy.findOne({ _id: reseller?.marketStrategy });

                profileMarkup = await B2BMarkupProfile.findOne({
                    resellerId: resellerId,
                });

                if (profileMarkup) {
                    specialB2bMarkup = profileMarkup?.activities.find(
                        (markup) => markup?.activity?.toString() == activity?._id.toString()
                    );
                }

                if (market) {
                    marketMarkup = market?.activities.find(
                        (markup) => markup?.activity?.toString() == activity?._id.toString()
                    );
                }

                if (
                    new Date(selectedActivities[i]?.date).setHours(0, 0, 0, 0) <
                    new Date().setHours(0, 0, 0, 0)
                ) {
                    return sendErrorResponse(
                        res,
                        400,
                        `"selectedActivities[${i}].date" must be a valid date`
                    );
                }

                if (attraction.bookingType === "booking" && attraction.bookingPriorDays) {
                    if (
                        new Date(selectedActivities[i]?.date).setHours(0, 0, 0, 0) <
                        new Date(
                            new Date().setDate(
                                new Date().getDate() + Number(attraction.bookingPriorDays)
                            )
                        ).setHours(0, 0, 0, 0)
                    ) {
                        return sendErrorResponse(
                            res,
                            400,
                            `"selectedActivities[${i}].date" must be a valid date`
                        );
                    }
                }

                if (
                    attraction.isCustomDate === true &&
                    (new Date(selectedActivities[i]?.date) < new Date(attraction?.startDate) ||
                        new Date(selectedActivities[i]?.date) > new Date(attraction?.endDate))
                ) {
                    return sendErrorResponse(
                        res,
                        400,
                        `${
                            activity?.name
                        } is not avaialble on your date. Please select a date between ${formatDate(
                            attraction?.startDate
                        )} and ${formatDate(attraction?.endDate)} `
                    );
                }

                if (activity.base === "hourly" && !selectedActivities[i]?.hoursCount) {
                    return sendErrorResponse(res, 400, "hours count is required");
                }
                if (attraction.bookingType === "ticket" && activity.activityType === "transfer") {
                    return sendErrorResponse(
                        res,
                        4000,
                        "sorry, this ticket attraction not available at this momemnt"
                    );
                }
                if (attraction.bookingType === "ticket" && activity.base === "hourly") {
                    return sendErrorResponse(
                        res,
                        400,
                        "sorry, this ticket attraction not available at this momemnt"
                    );
                }

                const selectedDay = dayNames[new Date(selectedActivities[i]?.date).getDay()];

                const objIndex = attraction.availability?.findIndex((item) => {
                    return item?.day?.toLowerCase() === selectedDay?.toLowerCase();
                });

                if (objIndex === -1 || attraction.availability[objIndex]?.isEnabled === false) {
                    return sendErrorResponse(
                        res,
                        400,
                        `sorry, ${activity?.name} is off on ${selectedDay}`
                    );
                }

                for (let j = 0; j < attraction.offDates?.length; j++) {
                    const { from, to } = attraction.offDates[j];
                    if (
                        new Date(selectedActivities[i]?.date) >= new Date(from) &&
                        new Date(selectedActivities[i]?.date) <= new Date(to)
                    ) {
                        return sendErrorResponse(
                            res,
                            400,
                            `${activity?.name} is off between ${formatDate(from)} and ${formatDate(
                                to
                            )} `
                        );
                    }
                }

                let adultActivityPrice = activity.adultCost;
                let childActivityPrice = activity.childCost || 0;
                let infantActivityPrice = activity.infantCost || 0;
                let hourlyActivityPrice = activity.hourlyCost;
                let adultActivityTotalPrice = 0;
                let childActivityTotalPrice = 0;
                let infantActivityTotalPrice = 0;
                let hourlyActivityTotalPrice = 0;
                let adultActivityTotalCost = 0;
                let childActivityTotalCost = 0;
                let infantActivityTotalCost = 0;
                let hourlyActivityTotalCost = 0;
                let sharedTransferPrice = activity.sharedTransferPrice;
                let sharedTransferTotalPrice = 0;
                let sharedTransferTotalCost = 0;
                let privateTransfers = [];
                let privateTransfersTotalPrice = 0;
                let privateTransfersTotalCost = 0;
                let markups = [];
                let totalMarketMarkup = 0;
                let totalProfileMarkup = 0;
                let totalResellerMarkup = 0;
                let totalSubAgentMarkup = 0;
                let resellerToSubAgentMarkup;
                let resellerToClientMarkup;
                let totalPax =
                    (Number(selectedActivities[i]?.adultsCount) || 0) +
                    (Number(selectedActivities[i]?.childrenCount) || 0);

                // if (req.reseller.role === "sub-agent") {
                //     resellerToSubAgentMarkup = await B2BSubAgentAttractionMarkup.findOne({
                //         resellerId: req.reseller?.referredBy,
                //         activityId: activity?._id,
                //     });
                // }

                // resellerToClientMarkup = await B2BClientAttractionMarkup.findOne({
                //     resellerId: req.reseller?._id,
                //     activityId: activity?._id,
                // });

                if (
                    attraction.connectedApi == "63f0a47b479d4a0376fe12f4" &&
                    attraction.isApiConnected &&
                    attraction.bookingType === "booking"
                ) {
                    let ticketData = await getTicketType(
                        selectedActivities[i].slot,
                        activity.productCode,
                        selectedActivities[i].adultsCount,
                        selectedActivities[i].childrenCount
                    );

                    let bookingId = await saveTicket(
                        ticketData,
                        activity.productCode,
                        selectedActivities[i].slot
                    );

                    if (!bookingId) {
                        return sendErrorResponse(
                            res,
                            400,
                            "sorry, something went wrong with our end. please try again later"
                        );
                    }

                    for (k = 0; k < ticketData.length; k++) {
                        if (ticketData[k].c_TicketTypeCode === "AD") {
                            adultActivityPrice = Number(ticketData[k].i_TicketPrice);
                            activity.adultCost = Number(ticketData[k].i_TicketPrice);
                        } else if (ticketData[k].c_TicketTypeCode === "CH") {
                            childActivityPrice = Number(ticketData[k].i_TicketPrice);
                            activity.childCost = Number(ticketData[k].i_TicketPrice);
                        }
                    }

                    selectedActivities[i].startTime = selectedActivities[i].slot.StartDateTime;
                    selectedActivities[i].endTime = selectedActivities[i].slot.EndDateTime;
                    selectedActivities[i].bookingReferenceNo = bookingId;
                }

                if (activity?.activityType === "transfer") {
                    if (selectedActivities[i]?.transferType === "without") {
                        return sendErrorResponse(res, 400, "please select a transfer option.");
                    } else if (selectedActivities[i]?.transferType === "shared") {
                        if (
                            activity.isSharedTransferAvailable === false ||
                            !sharedTransferPrice ||
                            !activity.sharedTransferCost
                        ) {
                            return sendErrorResponse(
                                res,
                                400,
                                "this activity doesn't have a shared transfer option"
                            );
                        }

                        if (marketMarkup) {
                            let markup = 0;
                            if (marketMarkup?.transferMarkupType === "flat") {
                                markup = marketMarkup?.transferMarkup;
                            } else {
                                markup = (marketMarkup?.transferMarkup * sharedTransferPrice) / 100;
                            }
                            if (activity.base === "hourly") {
                                totalMarketMarkup +=
                                    markup * totalPax * selectedActivities[i]?.hoursCount;
                            } else {
                                totalMarketMarkup += markup * totalPax;
                            }
                            sharedTransferPrice += markup;
                        }

                        if (specialB2bMarkup) {
                            let markup = 0;
                            if (specialB2bMarkup.markupType === "flat") {
                                markup = specialB2bMarkup.markup;
                            } else {
                                markup = (specialB2bMarkup.markup * sharedTransferPrice) / 100;
                            }
                            if (activity.base === "hourly") {
                                totalProfileMarkup +=
                                    markup * totalPax * selectedActivities[i]?.hoursCount;
                            } else {
                                totalProfileMarkup += markup * totalPax;
                            }
                            sharedTransferPrice += markup;
                        }

                        if (resellerToSubAgentMarkup) {
                            let markup = 0;
                            if (resellerToSubAgentMarkup.markupType === "flat") {
                                markup = resellerToSubAgentMarkup.markup;
                            } else {
                                markup =
                                    (resellerToSubAgentMarkup.markup * sharedTransferPrice) / 100;
                            }
                            if (activity.base === "hourly") {
                                totalResellerMarkup +=
                                    markup * totalPax * selectedActivities[i]?.hoursCount;
                            } else {
                                totalResellerMarkup += markup * totalPax;
                            }
                            sharedTransferPrice += markup;
                        }

                        if (resellerToClientMarkup) {
                            let markup = 0;
                            if (resellerToClientMarkup.markupType === "flat") {
                                markup = resellerToClientMarkup.markup;
                            } else {
                                markup =
                                    (resellerToClientMarkup.markup * sharedTransferPrice) / 100;
                            }
                            if (activity.base === "hourly") {
                                totalSubAgentMarkup +=
                                    markup * totalPax * selectedActivities[i]?.hoursCount;
                            } else {
                                totalSubAgentMarkup += markup * totalPax;
                            }
                            sharedTransferPrice += markup;
                        }

                        if (activity.base === "hourly") {
                            sharedTransferTotalPrice +=
                                sharedTransferPrice * totalPax * selectedActivities[i]?.hoursCount;
                            sharedTransferTotalCost +=
                                activity?.sharedTransferCost *
                                totalPax *
                                selectedActivities[i]?.hoursCount;
                        } else {
                            sharedTransferTotalPrice += sharedTransferPrice * totalPax;
                            sharedTransferTotalCost += activity?.sharedTransferCost * totalPax;
                        }
                    } else if (selectedActivities[i]?.transferType === "private") {
                        if (
                            activity.isPrivateTransferAvailable === false ||
                            !activity.privateTransfers ||
                            activity.privateTransfers?.length < 1
                        ) {
                            return sendErrorResponse(
                                res,
                                400,
                                "this activity doesn't have a private transfer option"
                            );
                        }

                        const sortedPvtTransfers = activity.privateTransfers.sort(
                            (a, b) => a.maxCapacity - b.maxCapacity
                        );

                        let tempPax = totalPax;
                        while (tempPax > 0) {
                            for (let j = 0; j < sortedPvtTransfers.length; j++) {
                                if (
                                    tempPax <= sortedPvtTransfers[j].maxCapacity ||
                                    j === sortedPvtTransfers.length - 1
                                ) {
                                    let currentPax =
                                        tempPax > sortedPvtTransfers[j].maxCapacity
                                            ? sortedPvtTransfers[j].maxCapacity
                                            : tempPax;
                                    let pvtTransferPrice = sortedPvtTransfers[j].price;
                                    let pvtTransferCost = sortedPvtTransfers[j].cost;

                                    if (marketMarkup) {
                                        let markup = 0;
                                        if (marketMarkup?.transferMarkupType === "flat") {
                                            markup = marketMarkup?.transferMarkup;
                                        } else {
                                            markup =
                                                (marketMarkup?.transferMarkup * pvtTransferPrice) /
                                                100;
                                        }
                                        if (activity.base === "hourly") {
                                            totalMarketMarkup +=
                                                markup * selectedActivities[i]?.hoursCount;
                                        } else {
                                            totalMarketMarkup += markup;
                                        }
                                        pvtTransferPrice += markup;
                                    }

                                    if (specialB2bMarkup) {
                                        let markup = 0;
                                        if (specialB2bMarkup.markupType === "flat") {
                                            markup = specialB2bMarkup.markup;
                                        } else {
                                            markup =
                                                (specialB2bMarkup.markup * pvtTransferPrice) / 100;
                                        }
                                        if (activity.base === "hourly") {
                                            totalProfileMarkup +=
                                                markup * selectedActivities[i]?.hoursCount;
                                        } else {
                                            totalProfileMarkup += markup;
                                        }
                                        pvtTransferPrice += markup;
                                    }

                                    if (resellerToSubAgentMarkup) {
                                        let markup = 0;
                                        if (resellerToSubAgentMarkup.markupType === "flat") {
                                            markup = resellerToSubAgentMarkup.markup;
                                        } else {
                                            markup =
                                                (resellerToSubAgentMarkup.markup *
                                                    pvtTransferPrice) /
                                                100;
                                        }
                                        if (activity.base === "hourly") {
                                            totalResellerMarkup +=
                                                markup * selectedActivities[i]?.hoursCount;
                                        } else {
                                            totalResellerMarkup += markup;
                                        }
                                        pvtTransferPrice += markup;
                                    }

                                    if (resellerToClientMarkup) {
                                        let markup = 0;
                                        if (resellerToClientMarkup.markupType === "flat") {
                                            markup = resellerToClientMarkup.markup;
                                        } else {
                                            markup =
                                                (resellerToClientMarkup.markup * pvtTransferPrice) /
                                                100;
                                        }
                                        if (activity.base === "hourly") {
                                            totalSubAgentMarkup +=
                                                markup * selectedActivities[i]?.hoursCount;
                                        } else {
                                            totalSubAgentMarkup += markup;
                                        }
                                        pvtTransferPrice += markup;
                                    }

                                    if (activity.base === "hourly") {
                                        pvtTransferPrice =
                                            pvtTransferPrice * selectedActivities[i]?.hoursCount;
                                        pvtTransferCost =
                                            pvtTransferCost * selectedActivities[i]?.hoursCount;
                                    }

                                    privateTransfersTotalPrice += pvtTransferPrice;
                                    privateTransfersTotalCost += pvtTransferCost;
                                    tempPax -= currentPax;

                                    const objIndex = privateTransfers.findIndex((obj) => {
                                        return obj?.pvtTransferId === sortedPvtTransfers[j]?._id;
                                    });

                                    if (objIndex === -1) {
                                        privateTransfers.push({
                                            pvtTransferId: sortedPvtTransfers[j]?._id,
                                            name: sortedPvtTransfers[j].name,
                                            maxCapacity: sortedPvtTransfers[j].maxCapacity,
                                            count: 1,
                                            price: sortedPvtTransfers[j].price,
                                            cost: sortedPvtTransfers[j].cost,
                                            totalCost: pvtTransferCost,
                                            totalPrice: pvtTransferPrice,
                                        });
                                    } else {
                                        privateTransfers[objIndex].count += 1;
                                        privateTransfers[objIndex].totalCost += pvtTransferCost;
                                        privateTransfers[objIndex].totalPrice += pvtTransferPrice;
                                    }

                                    if (tempPax <= 0) {
                                        break;
                                    }
                                }
                            }
                        }
                    } else {
                        return sendErrorResponse(
                            res,
                            400,
                            "please select a valid transfer option."
                        );
                    }
                } else {
                    if (attraction.bookingType === "ticket" && !attraction.isApiConnected) {
                        let adultTicketError = false;
                        let childTicketError = false;

                        let commonTickets = await AttractionTicket.find({
                            activity: activity._id,
                            status: "ok",
                            ticketFor: "common",
                            $or: [
                                {
                                    validity: true,
                                    validTill: {
                                        $gte: new Date(selectedActivities[i]?.date).toISOString(),
                                    },
                                },
                                { validity: false },
                            ],
                        }).count();
                        const adultTickets = await AttractionTicket.find({
                            activity: activity._id,
                            status: "ok",
                            ticketFor: "adult",
                            $or: [
                                {
                                    validity: true,
                                    validTill: {
                                        $gte: new Date(selectedActivities[i]?.date).toISOString(),
                                    },
                                },
                                { validity: false },
                            ],
                        }).count();
                        const childrenTickets = await AttractionTicket.find({
                            activity: activity._id,
                            status: "ok",
                            ticketFor: "child",
                            $or: [
                                {
                                    validity: true,
                                    validTill: {
                                        $gte: new Date(selectedActivities[i]?.date).toISOString(),
                                    },
                                },
                                { validity: false },
                            ],
                        }).count();

                        if (adultTickets < Number(selectedActivities[i]?.adultsCount)) {
                            if (
                                commonTickets - adultTickets <
                                Number(selectedActivities[i]?.adultsCount)
                            ) {
                                adultTicketError = true;
                            } else {
                                commonTickets -=
                                    Number(selectedActivities[i]?.adultsCount) - adultTickets;
                            }
                        }

                        if (childrenTickets < Number(selectedActivities[i]?.childrenCount)) {
                            if (
                                commonTickets - childrenTickets <
                                Number(selectedActivities[i]?.childrenCount)
                            ) {
                                childTicketError = true;
                            } else {
                                commonTickets -=
                                    Number(selectedActivities[i]?.childrenCount) - childrenTickets;
                            }
                        }

                        if (adultTicketError || childTicketError) {
                            return sendErrorResponse(
                                res,
                                500,
                                `${adultTicketError ? "adult tickets" : ""}${
                                    adultTicketError && childTicketError ? " and " : ""
                                }${childTicketError ? "child tickets" : ""} sold out`
                            );
                        }
                    }

                    if (activity.base !== "hourly") {
                        if (!adultActivityPrice) {
                            return sendErrorResponse(
                                res,
                                400,
                                "sorry, something went wrong with our end. please try again later"
                            );
                        }

                        if (marketMarkup) {
                            let markup = 0;
                            if (marketMarkup?.markupType === "flat") {
                                markup = marketMarkup?.markup;
                            } else {
                                markup = (marketMarkup?.markup * adultActivityPrice) / 100;
                            }

                            totalMarketMarkup +=
                                markup * Number(selectedActivities[i]?.adultsCount);
                            adultActivityPrice += markup;
                        }

                        if (specialB2bMarkup) {
                            let markup = 0;
                            if (specialB2bMarkup.markupType === "flat") {
                                markup = specialB2bMarkup.markup;
                            } else {
                                markup = (specialB2bMarkup.markup * adultActivityPrice) / 100;
                            }
                            totalProfileMarkup +=
                                markup * Number(selectedActivities[i]?.adultsCount);
                            adultActivityPrice += markup;
                        }

                        if (resellerToSubAgentMarkup) {
                            let markup = 0;
                            if (resellerToSubAgentMarkup.markupType === "flat") {
                                markup = resellerToSubAgentMarkup.markup;
                            } else {
                                markup =
                                    (resellerToSubAgentMarkup.markup *
                                        activity.adultActivityPrice) /
                                    100;
                            }

                            totalResellerMarkup +=
                                markup * Number(selectedActivities[i]?.adultsCount);
                            adultActivityPrice += markup;
                        }

                        if (resellerToClientMarkup) {
                            let markup = 0;
                            if (resellerToClientMarkup.markupType === "flat") {
                                markup = resellerToClientMarkup.markup;
                            } else {
                                markup = (resellerToClientMarkup.markup * adultActivityPrice) / 100;
                            }
                            totalSubAgentMarkup +=
                                markup * Number(selectedActivities[i]?.adultsCount);
                            adultActivityPrice += markup;
                        }

                        adultActivityTotalPrice +=
                            adultActivityPrice * Number(selectedActivities[i]?.adultsCount);
                        if (attraction.bookingType === "booking") {
                            adultActivityTotalCost +=
                                activity.adultCost * Number(selectedActivities[i]?.adultsCount) ||
                                0;
                        }

                        if (Number(selectedActivities[i]?.childrenCount) > 0) {
                            if (!childActivityPrice) {
                                return sendErrorResponse(
                                    res,
                                    400,
                                    "sorry, something went wrong with our end. please try again later"
                                );
                            }

                            if (marketMarkup) {
                                let markup = 0;
                                if (marketMarkup?.markupType === "flat") {
                                    markup = marketMarkup?.markup;
                                } else {
                                    markup = (marketMarkup?.markup * childActivityPrice) / 100;
                                }

                                totalMarketMarkup +=
                                    markup * Number(selectedActivities[i]?.childrenCount);
                                childActivityPrice += markup;
                            }

                            if (specialB2bMarkup) {
                                let markup = 0;
                                if (specialB2bMarkup.markupType === "flat") {
                                    markup = specialB2bMarkup.markup;
                                } else {
                                    markup = (specialB2bMarkup.markup * childActivityPrice) / 100;
                                }
                                totalProfileMarkup +=
                                    markup * Number(selectedActivities[i]?.childrenCount);
                                childActivityPrice += markup;
                            }

                            if (resellerToSubAgentMarkup) {
                                let markup = 0;
                                if (resellerToSubAgentMarkup.markupType === "flat") {
                                    markup = resellerToSubAgentMarkup.markup;
                                } else {
                                    markup =
                                        (resellerToSubAgentMarkup.markup *
                                            activity?.childActivityPrice) /
                                        100;
                                }
                                totalResellerMarkup +=
                                    markup * Number(selectedActivities[i]?.childrenCount);
                                childActivityPrice += markup;
                            }

                            if (resellerToClientMarkup) {
                                let markup = 0;
                                if (resellerToClientMarkup.markupType === "flat") {
                                    markup = resellerToClientMarkup.markup;
                                } else {
                                    markup =
                                        (resellerToClientMarkup.markup * childActivityPrice) / 100;
                                }
                                totalSubAgentMarkup +=
                                    markup * Number(selectedActivities[i]?.childrenCount);
                                childActivityPrice += markup;
                            }

                            childActivityTotalPrice +=
                                childActivityPrice * Number(selectedActivities[i]?.childrenCount);
                            if (attraction.bookingType === "booking") {
                                childActivityTotalCost +=
                                    activity.childCost *
                                        Number(selectedActivities[i]?.childrenCount) || 0;
                            }
                        }

                        if (
                            Number(selectedActivities[i]?.infantCount) > 0 &&
                            infantActivityPrice > 0
                        ) {
                            if (marketMarkup) {
                                let markup = 0;
                                if (marketMarkup?.markupType === "flat") {
                                    markup = marketMarkup?.markup;
                                } else {
                                    markup = (marketMarkup?.markup * infantActivityPrice) / 100;
                                }
                                totalMarketMarkup +=
                                    markup * Number(selectedActivities[i]?.infantCount);
                                infantActivityPrice += markup;
                            }

                            if (specialB2bMarkup) {
                                let markup = 0;
                                if (specialB2bMarkup.markupType === "flat") {
                                    markup = specialB2bMarkup.markup;
                                } else {
                                    markup = (specialB2bMarkup.markup * infantActivityPrice) / 100;
                                }
                                totalProfileMarkup +=
                                    markup * Number(selectedActivities[i]?.infantCount);
                                infantActivityPrice += markup;
                            }

                            if (resellerToSubAgentMarkup) {
                                let markup = 0;
                                if (resellerToSubAgentMarkup.markupType === "flat") {
                                    markup = resellerToSubAgentMarkup.markup;
                                } else {
                                    markup =
                                        (resellerToSubAgentMarkup.markup *
                                            selectedActivities[i]?.infantActivityPrice) /
                                        100;
                                }
                                totalResellerMarkup +=
                                    markup * Number(selectedActivities[i]?.infantCount);
                                infantActivityPrice += markup;
                            }

                            if (resellerToClientMarkup) {
                                let markup = 0;
                                if (resellerToClientMarkup.markupType === "flat") {
                                    markup = resellerToClientMarkup.markup;
                                } else {
                                    markup =
                                        (resellerToClientMarkup.markup * infantActivityPrice) / 100;
                                }
                                totalSubAgentMarkup +=
                                    markup * Number(selectedActivities[i]?.infantCount);
                                infantActivityPrice += markup;
                            }

                            infantActivityTotalPrice +=
                                infantActivityPrice * Number(selectedActivities[i]?.infantCount);
                            if (attraction.bookingType === "booking") {
                                infantActivityTotalCost +=
                                    activity.infantCost *
                                        Number(selectedActivities[i]?.infantCount) || 0;
                            }
                        }
                    } else {
                        if (!hourlyActivityPrice) {
                            return sendErrorResponse(
                                res,
                                400,
                                "sorry, something went wrong with our end. please try again later"
                            );
                        }
                        if (marketMarkup) {
                            let markup = 0;
                            if (marketMarkup?.markupType === "flat") {
                                markup = marketMarkup?.markup;
                            } else {
                                markup = (marketMarkup?.markup * hourlyActivityPrice) / 100;
                            }
                            totalMarketMarkup +=
                                markup * Number(selectedActivities[i]?.adultsCount);
                            hourlyActivityPrice += markup;
                        }

                        if (specialB2bMarkup) {
                            let markup = 0;
                            if (specialB2bMarkup.markupType === "flat") {
                                markup = specialB2bMarkup.markup;
                            } else {
                                markup = (specialB2bMarkup.markup * hourlyActivityPrice) / 100;
                            }
                            totalProfileMarkup +=
                                markup * Number(selectedActivities[i]?.adultsCount);
                            hourlyActivityPrice += markup;
                        }

                        if (resellerToSubAgentMarkup) {
                            let markup = 0;
                            if (resellerToSubAgentMarkup.markupType === "flat") {
                                markup = resellerToSubAgentMarkup.markup;
                            } else {
                                markup =
                                    (resellerToSubAgentMarkup.markup *
                                        activity.hourlyActivityPrice) /
                                    100;
                            }

                            totalResellerMarkup +=
                                markup * Number(selectedActivities[i]?.adultsCount);
                            hourlyActivityPrice += markup;
                        }

                        if (resellerToClientMarkup) {
                            let markup = 0;
                            if (resellerToClientMarkup.markupType === "flat") {
                                markup = resellerToClientMarkup.markup;
                            } else {
                                markup = (resellerToClientMarkup.markup * adultActivityPrice) / 100;
                            }
                            totalSubAgentMarkup +=
                                markup * Number(selectedActivities[i]?.adultsCount);
                            adultActivityPrice += markup;
                        }

                        hourlyActivityTotalPrice +=
                            hourlyActivityPrice * Number(selectedActivities[i]?.hoursCount);
                        hourlyActivityTotalCost +=
                            activity.hourlyCost * Number(selectedActivities[i]?.hoursCount) || 0;
                    }

                    if (selectedActivities[i]?.transferType === "shared") {
                        if (
                            activity.isSharedTransferAvailable === false ||
                            !sharedTransferPrice ||
                            !activity.sharedTransferCost
                        ) {
                            return sendErrorResponse(
                                res,
                                400,
                                "this activity doesn't have a shared transfer option"
                            );
                        }

                        sharedTransferTotalPrice += sharedTransferPrice * totalPax;
                        sharedTransferTotalCost += activity?.sharedTransferCost * totalPax;
                    } else if (selectedActivities[i]?.transferType === "private") {
                        if (
                            activity.isPrivateTransferAvailable === false ||
                            !activity.privateTransfers ||
                            activity.privateTransfers?.length < 1
                        ) {
                            return sendErrorResponse(
                                res,
                                400,
                                "this activity doesn't have a private transfer option"
                            );
                        }

                        const sortedPvtTransfers = activity.privateTransfers.sort(
                            (a, b) => a.maxCapacity - b.maxCapacity
                        );

                        let tempPax = totalPax;
                        while (tempPax > 0) {
                            for (let j = 0; j < sortedPvtTransfers.length; j++) {
                                if (
                                    tempPax <= sortedPvtTransfers[j].maxCapacity ||
                                    j === sortedPvtTransfers.length - 1
                                ) {
                                    let currentPax =
                                        tempPax > sortedPvtTransfers[j].maxCapacity
                                            ? sortedPvtTransfers[j].maxCapacity
                                            : tempPax;
                                    let pvtTransferPrice = sortedPvtTransfers[j].price;
                                    let pvtTransferCost = sortedPvtTransfers[j].cost;

                                    privateTransfersTotalPrice += pvtTransferPrice;
                                    privateTransfersTotalCost += pvtTransferCost;
                                    tempPax -= currentPax;

                                    const objIndex = privateTransfers.findIndex((obj) => {
                                        return obj?.pvtTransferId === sortedPvtTransfers[j]?._id;
                                    });

                                    if (objIndex === -1) {
                                        privateTransfers.push({
                                            pvtTransferId: sortedPvtTransfers[j]?._id,
                                            name: sortedPvtTransfers[j].name,
                                            maxCapacity: sortedPvtTransfers[j].maxCapacity,
                                            count: 1,
                                            price: pvtTransferPrice,
                                            cost: sortedPvtTransfers[j].cost,
                                            totalPrice: pvtTransferPrice,
                                        });
                                    } else {
                                        privateTransfers[objIndex].count += 1;
                                        privateTransfers[objIndex].totalPrice += pvtTransferPrice;
                                    }

                                    if (tempPax <= 0) {
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }

                let isExpiry = false;
                if (attraction.cancellationType !== "nonRefundable") {
                    isExpiry = true;
                }

                if (reseller?.role === "sub-agent") {
                    markups.push({
                        to: req.reseller?.referredBy,
                        amount: totalResellerMarkup,
                        isExpiry,
                    });
                }
                markups.push({
                    to: reseller?._id,
                    amount: totalSubAgentMarkup,
                    isExpiry,
                });

                selectedActivities[i].activityType = activity.activityType;
                // ACTIVITY PRICE
                if (activity.activityType === "normal") {
                    selectedActivities[i].adultActivityPrice = adultActivityPrice || 0;
                    selectedActivities[i].childActivityPrice = childActivityPrice || 0;
                    selectedActivities[i].infantActivityPrice = infantActivityPrice || 0;
                    selectedActivities[i].adultActivityTotalPrice = adultActivityTotalPrice;
                    selectedActivities[i].childActivityTotalPrice = childActivityTotalPrice;
                    selectedActivities[i].infantActivityTotalPrice = infantActivityTotalPrice;
                    // ACTIVITY COST
                    selectedActivities[i].adultActivityCost = activity.adultCost || 0;
                    selectedActivities[i].childActivityCost = activity.childCost || 0;
                    selectedActivities[i].infantActivityCost = activity.infantCost || 0;
                    selectedActivities[i].adultActivityTotalCost = adultActivityTotalCost;
                    selectedActivities[i].childActivityTotalCost = childActivityTotalCost;
                    selectedActivities[i].infantActivityTotalCost = infantActivityTotalCost;

                    selectedActivities[i].hourlyActivityPrice = hourlyActivityPrice || 0;
                    selectedActivities[i].hourlyActivityTotalPrice = hourlyActivityTotalPrice;
                    selectedActivities[i].hourlyActivityCost = activity.hourlyCost || 0;
                    selectedActivities[i].hourlyActivityTotalCost = hourlyActivityTotalCost;

                    selectedActivities[i].activityTotalPrice =
                        adultActivityTotalPrice +
                        childActivityTotalPrice +
                        infantActivityTotalPrice +
                        hourlyActivityTotalPrice;
                    selectedActivities[i].activityTotalCost =
                        adultActivityTotalCost +
                        childActivityTotalCost +
                        infantActivityTotalCost +
                        hourlyActivityTotalCost;
                }

                if (selectedActivities[i].transferType === "shared") {
                    selectedActivities[i].sharedTransferPrice = sharedTransferPrice;
                    selectedActivities[i].sharedTransferTotalPrice = sharedTransferTotalPrice;
                    selectedActivities[i].sharedTransferCost = activity.sharedTransferCost;
                    selectedActivities[i].sharedTransferTotalCost = sharedTransferTotalCost;
                }

                if (selectedActivities[i].transferType === "private") {
                    selectedActivities[i].privateTransfers = privateTransfers;
                    selectedActivities[i].privateTransfersTotalPrice = privateTransfersTotalPrice;
                    selectedActivities[i].privateTransfersTotalCost = privateTransfersTotalCost;
                }

                let vatPercentage = 0;
                let totalVat = 0;
                if (activity.isVat) {
                    vatPercentage = activity.vat || 0;
                    if (activity.activityType === "transfer") {
                        totalVat =
                            ((sharedTransferTotalPrice + privateTransfersTotalPrice) / 100) *
                            vatPercentage;
                    } else {
                        totalVat =
                            ((selectedActivities[i].activityTotalPrice || 0) / 100) * vatPercentage;
                    }
                }

                selectedActivities[i].isvat = activity.isVat;
                selectedActivities[i].vatPercentage = vatPercentage;
                selectedActivities[i].totalVat = totalVat;

                selectedActivities[i].grandTotal =
                    (selectedActivities[i].activityTotalPrice || 0) +
                    sharedTransferTotalPrice +
                    privateTransfersTotalPrice +
                    totalVat;

                selectedActivities[i].totalCost =
                    (selectedActivities[i].activityTotalCost || 0) +
                    sharedTransferTotalCost +
                    privateTransfersTotalCost +
                    totalVat;
                selectedActivities[i].profit = 0;
                selectedActivities[i].status = "pending";
                selectedActivities[i].bookingType = attraction.bookingType;
                selectedActivities[i].attraction = attraction?._id;

                selectedActivities[i].resellerMarkup = totalResellerMarkup;
                selectedActivities[i].subAgentMarkup = totalSubAgentMarkup;
                selectedActivities[i].profileMarkup = totalProfileMarkup;
                selectedActivities[i].marketMarkup = totalMarketMarkup;
                selectedActivities[i].subAgentMarkup = totalSubAgentMarkup;
                selectedActivities[i].totalMarkup = totalResellerMarkup + totalSubAgentMarkup;
                selectedActivities[i].markups = markups;

                totalAmount += selectedActivities[i].grandTotal;
            }

            const otp = await sendMobileOtp(countryDetail.phonecode, phoneNumber);

            const attractionOrder = new B2BAttractionOrder({
                activities: selectedActivities,
                totalAmount,
                reseller: reseller?._id,
                country,
                name,
                email,
                phoneNumber,
                orderStatus: "pending",
                otp,
                orderedBy: reseller?.role,
                agentReferenceNumber,
                referenceNumber: generateUniqueString("B2BATO"),
                type,
            });
            await attractionOrder.save();

            res.status(200).json(attractionOrder);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    completeAttractionOrder: async (req, res) => {
        try {
            const { orderId } = req.params;
            const { otp = 12345 } = req.body;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            const attractionOrder = await B2BAttractionOrder.findOne({
                _id: orderId,
                // reseller: req.reseller._id,
            }).populate({
                path: "activities.activity",
                populate: {
                    path: "attraction",
                    populate: {
                        path: "destination",
                    },
                },
            });

            if (!attractionOrder) {
                return sendErrorResponse(res, 404, "attraction order not found");
            }

            if (attractionOrder.orderStatus === "completed") {
                return sendErrorResponse(res, 400, "sorry, you have already completed this order!");
            }

            if (!attractionOrder.otp || attractionOrder.otp !== Number(otp)) {
                return sendErrorResponse(res, 400, "incorrect otp!");
            }

            const reseller = await Reseller.findOne({ _id: attractionOrder?.reseller });
            if (!reseller) {
                return sendErrorResponse(res, 500, "reseller not found!");
            }

            let totalAmount = attractionOrder.totalAmount;

            let wallet = await B2BWallet.findOne({
                reseller: attractionOrder?.reseller,
            });

            const balanceAvailable = checkWalletBalance(wallet, totalAmount);
            if (!balanceAvailable) {
                // let reseller = req.reseller;
                // sendInsufficentBalanceMail(reseller);
                return sendErrorResponse(
                    res,
                    400,
                    "Insufficient balance. please reacharge and try again"
                );
            }

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
                } else if (
                    activity.attraction.connectedApi == "63f0a47b479d4a0376fe12f4" &&
                    activity.attraction.isApiConnected &&
                    activity.isApiSync == true
                ) {
                    const timestamp = new Date().getTime();

                    const randomNumber = Math.floor(Math.random() * 100000000);

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
                }

                attractionOrder.activities[i].totalCost = totalPurchaseCost;
                attractionOrder.activities[i].profit =
                    attractionOrder.activities[i].grandTotal -
                    (attractionOrder.activities[i].totalCost +
                        (attractionOrder.activities[i].resellerMarkup || 0) +
                        (attractionOrder.activities[i].subAgentMarkup || 0));
            }

            // deducting amount from wallet
            deductAmountFromWallet(wallet, totalAmount);

            // let reseller = req.reseller;
            // sendWalletDeductMail(reseller, attractionOrder, totalAmount);

            await B2BTransaction.create({
                reseller: reseller?._id,
                paymentProcessor: "wallet",
                product: "attraction",
                processId: orderId,
                description: `Attraction order payment`,
                debitAmount: totalAmount,
                creditAmount: 0,
                directAmount: 0,
                closingBalance: wallet.balance,
                dueAmount: wallet.creditUsed,
                remark: "Attraction order payment",
                dateTime: new Date(),
            });
            await AttractionTransaction.create({
                reseller: reseller?._id,
                admin: req.admin._id,
                referenceNumber: attractionOrder.agentReferenceNumber,
                paymentProcessor: "wallet",
                processId: orderId,
                attractionId: attractionOrder.activities[0]?.activity?.attraction?._id,
                attractionName: attractionOrder.activities[0]?.activity?.attraction?.title,
                activityId: attractionOrder.activities[0]?.activity?._id,
                activityName: attractionOrder.activities[0]?.activity?.name,
                description: `Adults -${attractionOrder?.activities[0]?.adultsCount} Childrens -${attractionOrder?.activities[0]?.childrenCount} infant - ${attractionOrder?.activities[0]?.infantCount}`,
                debitAmount: totalAmount,
                creditAmount: 0,
                directAmount: 0,
                closingBalance: wallet.balance,
                dueAmount: wallet.creditUsed,
                price: attractionOrder.activities[0]?.grandTotal,
                profit: attractionOrder.activities[0]?.profit,
                cost: attractionOrder.activities[0]?.totalCost,
                remark: "Attraction order payment",
                dateTime: new Date(),
            });

            attractionOrder.otp = "";
            attractionOrder.orderStatus = "completed";
            await attractionOrder.save();

            sendAttractionOrderEmail(reseller, attractionOrder);
            sendAttractionOrderAdminEmail(attractionOrder);

            res.status(200).json({
                message: "order successfully placed",
                referenceNumber: attractionOrder.referenceNumber,
                _id: attractionOrder?._id,
            });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 400, err);
        }
    },

    getAllAttractionTransactions: async (req, res) => {
        try {
            const { result, skip, limit } = await getAttractionTransaction({
                ...req.query,
            });

            res.status(200).json({ result, skip, limit });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAttractionTransactionsSheet: async (req, res) => {
        try {
            await generateAttractionTransactionsSheet({ ...req.query, res });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAttractionOrderTickets: async (req, res) => {
        try {
            const { orderId, activityId } = req.params;
            console.log(orderId, "orderiD");
            const orderDetails = await B2BAttractionOrder.aggregate([
                {
                    $match: {
                        _id: Types.ObjectId(orderId),
                        $or: [{ orderStatus: "completed" }, { orderStatus: "paid" }],
                        activities: {
                            $elemMatch: { activity: Types.ObjectId(activityId) },
                        },
                    },
                },
                { $unwind: "$activities" },
                {
                    $match: {
                        "activities.activity": Types.ObjectId(activityId),
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
                    },
                },
            ]);

            if (orderDetails.length < 1 || orderDetails?.activities?.length < 1) {
                return sendErrorResponse(res, 400, "order not found");
            }

            const theme = await AttractionTicketSetting.findOne({});

            if (orderDetails[0].activities.bookingType === "booking") {
                if (theme.selected === "theme2") {
                    console.log("call reached 2");
                    const pdfBuffer = await createBookingTicketPdfTheme2(
                        orderDetails[0].activities
                    );

                    res.set({
                        "Content-Type": "application/pdf",

                        "Content-Disposition": "attachment; filename=tickets.pdf",
                    });
                    res.send(pdfBuffer);
                } else {
                    const pdfBuffer = await createBookingTicketPdf(orderDetails[0].activities);

                    res.set({
                        "Content-Type": "application/pdf",

                        "Content-Disposition": "attachment; filename=tickets.pdf",
                    });
                    res.send(pdfBuffer);
                }
            } else {
                if (theme.selected === "theme2") {
                    console.log("call reached 2");

                    const pdfBuffer = await createMultipleTicketPdfTheme2(
                        orderDetails[0].activities
                    );

                    res.set({
                        "Content-Type": "application/pdf",

                        "Content-Disposition": "attachment; filename=tickets.pdf",
                    });
                    res.send(pdfBuffer);
                } else {
                    const pdfBuffer = await createMultipleTicketPdf(orderDetails[0].activities);

                    res.set({
                        "Content-Type": "application/pdf",

                        "Content-Disposition": "attachment; filename=tickets.pdf",
                    });
                    res.send(pdfBuffer);
                }
            }

            // res.status(200).json(orderDetails[0]);
        } catch (err) {
            console.log(err, "err");
            sendErrorResponse(res, 500, err);
        }
    },

    getMarkup: async (req, res) => {
        try {
            const { resellerId, activityId } = req.params;

            if (!isValidObjectId(resellerId)) {
                return sendErrorResponse(res, 400, "Invalid profileId ");
            }

            const profile = await B2BMarkupProfile.findOne({ resellerId });

            if (!profile) {
                return sendErrorResponse(res, 400, "Profile not found");
            }

            let markup = profile.activities.find((act) => {
                return act.activity.toString() === activityId.toString();
            });

            res.status(200).json(markup);
        } catch (err) {
            console.error(err);
            sendErrorResponse(res, 500, err);
        }
    },
};
