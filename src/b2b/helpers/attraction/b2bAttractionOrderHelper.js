const { isValidObjectId, Types } = require("mongoose");
const moment = require("moment");

const { sendMobileOtp } = require("../../../helpers");
const {
    B2BAttractionOrder,
    B2BClientAttractionMarkup,
    B2BSubAgentAttractionMarkup,
    B2BWallet,
    B2BTransaction,
    B2BMarkupProfile,
} = require("../../models");
const {
    Country,
    AttractionActivity,
    AttractionTicket,
    Attraction,
    BurjKhalifaLog,
} = require("../../../models");
const { generateUniqueString, formatDate } = require("../../../utils");
const sendAttractionOrderEmail = require("../../helpers/sendAttractionOrderEmail");
const sendAttractionOrderAdminEmail = require("../../helpers/sendAttractionOrderAdminEmail");
const sendInsufficentBalanceMail = require("../../helpers/sendInsufficentBalanceEmail");
const sendWalletDeductMail = require("../../helpers/sendWalletDeductMail");
const { getTicketType, createDubaiParkOrder, saveTicket, confirmTicket } = require("../../helpers");
const { updateTicketCountCache } = require("../../../config/cache");
const {
    ticketCountHelper,
    updateTicketCountHelper,
} = require("../../../helpers/attraction/attractionTicketHelper");

const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

module.exports = {
    attractionOrderCreateHelper: async ({ referenceNumber, reseller, ...data }) => {
        try {
            const { selectedActivities } = data;

            let totalAmount = 0;
            for (let i = 0; i < selectedActivities?.length; i++) {
                if (!isValidObjectId(selectedActivities[i]?.activity)) {
                    throw Error(`"selectedActivities[${i}].activity", Invalid activity id`);
                }
                if (
                    selectedActivities[i]?.adultsCount < 1 &&
                    selectedActivities[i]?.childrenCount < 1
                ) {
                    throw Error(
                        `selectedActivity ${i} atleast should have  one adult or children count `
                    );
                }

                const activity = await AttractionActivity.findOne({
                    _id: selectedActivities[i]?.activity,
                    isDeleted: false,
                });
                if (!activity) {
                    throw Error(`"selectedActivities[${i}].activity", Activity not found!`);
                }

                const attraction = await Attraction.findOne({
                    _id: activity.attraction,
                    isDeleted: false,
                    isB2bActive: true,
                });
                if (!attraction) {
                    throw Error(`${activity.name}'s attraction not found!`);
                }

                let specialB2bMarkup;
                let profileMarkup;
                // taking profile markup, it is only available for agents
                // not for sub-agents
                if (reseller.role === "reseller") {
                    profileMarkup = await B2BMarkupProfile.findOne({
                        resellerId: reseller?._id,
                    });
                } else {
                    profileMarkup = await B2BMarkupProfile.findOne({
                        resellerId: reseller?.referredBy,
                    });
                }

                if (profileMarkup) {
                    specialB2bMarkup = profileMarkup?.activities.find(
                        (markup) => markup?.activity?.toString() == activity?._id.toString()
                    );
                }

                if (moment(selectedActivities[i]?.date).isBefore(moment(), "day")) {
                    throw Error(`"selectedActivities[${i}].date" the date must be today or future`);
                }

                if (attraction.bookingType === "booking" && attraction.bookingPriorDays > 0) {
                    if (
                        moment(selectedActivities[i]?.date).isBefore(
                            moment().add(Number(attraction.bookingPriorDays), "day"),
                            "day"
                        )
                    ) {
                        throw Error(
                            `"selectedActivities[${i}].date" must be ${attraction.bookingPriorDays} days prior`
                        );
                    }
                }

                if (
                    attraction.isCustomDate === true &&
                    (moment(selectedActivities[i]?.date).isBefore(
                        moment(attraction.startDate),
                        "day"
                    ) ||
                        moment(selectedActivities[i]?.date).isAfter(
                            moment(attraction.endDate),
                            "day"
                        ))
                ) {
                    throw Error(
                        `${
                            activity?.name
                        } is not avaialble on your date. Please select a date between ${moment(
                            attraction?.startDate
                        ).format("D MMM YYYY")} and ${moment(attraction?.endDate).format(
                            "D MMM YYYY"
                        )} `
                    );
                }

                if (activity.base === "hourly" && !selectedActivities[i]?.hoursCount) {
                    throw Error(`hours count is required for ${activity.name}`);
                }
                if (attraction.bookingType === "ticket" && activity.activityType === "transfer") {
                    throw Error(`sorry, ${activity.name} activity not available at this momemnt`);
                }
                if (attraction.bookingType === "ticket" && activity.base === "hourly") {
                    throw Error(`sorry, ${activity.name} activity not available at this momemnt`);
                }

                const selectedDay = dayNames[new Date(selectedActivities[i]?.date).getDay()];

                const objIndex = attraction.availability?.findIndex((item) => {
                    return item?.day?.toLowerCase() === selectedDay?.toLowerCase();
                });

                if (objIndex === -1 || attraction.availability[objIndex]?.isEnabled === false) {
                    throw Error(`sorry, ${activity?.name} is off on ${selectedDay}`);
                }

                for (let j = 0; j < attraction.offDates?.length; j++) {
                    const { from, to } = attraction.offDates[j];
                    if (
                        moment(selectedActivities[i]?.date).isSameOrAfter(moment(from), "day") &&
                        moment(selectedActivities[i]?.date).isSameOrBefore(moment(to), "day")
                    ) {
                        throw Error(
                            `${activity?.name} is off between ${moment(from).format(
                                "D MMM YYYY"
                            )} and ${moment(to).format("D MMM YYYY")} `
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
                let totalResellerMarkup = 0;
                let totalSubAgentMarkup = 0;
                let resellerToSubAgentMarkup;
                let resellerToClientMarkup;
                let adultsCount = Number(selectedActivities[i]?.adultsCount) || 0;
                let childrenCount = Number(selectedActivities[i]?.childrenCount) || 0;
                let totalPax = adultsCount + childrenCount;

                if (reseller.role === "sub-agent") {
                    resellerToSubAgentMarkup = await B2BSubAgentAttractionMarkup.findOne({
                        resellerId: reseller?._id,
                        activityId: activity?._id,
                    });
                }

                resellerToClientMarkup = await B2BClientAttractionMarkup.findOne({
                    resellerId: reseller?._id,
                    activityId: activity?._id,
                });

                if (
                    attraction.connectedApi == "63f0a47b479d4a0376fe12f4" &&
                    attraction.isApiConnected &&
                    attraction.bookingType === "booking"
                ) {
                    let ticketData = await getTicketType(
                        selectedActivities[i].slot,
                        activity.productCode,
                        selectedActivities[i].adultsCount,
                        selectedActivities[i].childrenCount,
                        reseller,
                        referenceNumber
                    );

                    let bookingId = await saveTicket(
                        ticketData,
                        activity.productCode,
                        selectedActivities[i].slot,
                        reseller,
                        referenceNumber
                    );

                    if (!bookingId) {
                        throw Error(
                            `sorry, something went wrong with our end. please try again later`
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

                    // if (adultsCount > 0) {
                    //     if (!adultActivityPrice) {
                    //         return sendErrorResponse(
                    //             res,
                    //             500,
                    //             "sorry, something went wrong with our end. please try again later"
                    //         );
                    //     }

                    // if (specialB2bMarkup) {
                    //     let markup = 0;
                    //     if (specialB2bMarkup.markupType === "flat") {
                    //         markup = Number(specialB2bMarkup.markup);
                    //     } else {
                    //         markup = Number(specialB2bMarkup.markup * adultActivityPrice) / 100;
                    //     }
                    //     adultActivityPrice += markup;
                    // }

                    // console.log(adultActivityPrice, "adultActivityPrice2");

                    //     if (resellerToSubAgentMarkup) {
                    //         let markup = 0;
                    //         if (resellerToSubAgentMarkup.markupType === "flat") {
                    //             markup = resellerToSubAgentMarkup.markup;
                    //         } else {
                    //             markup =
                    //                 (resellerToSubAgentMarkup.markup *
                    //                     activity.adultActivityPrice) /
                    //                 100;
                    //         }

                    //         totalResellerMarkup +=
                    //             markup * adultsCount;
                    //         adultActivityPrice += markup;
                    //     }

                    //     if (resellerToClientMarkup) {
                    //         let markup = 0;
                    //         if (resellerToClientMarkup.markupType === "flat") {
                    //             markup = resellerToClientMarkup.markup;
                    //         } else {
                    //             markup = (resellerToClientMarkup.markup * adultActivityPrice) / 100;
                    //         }
                    //         totalSubAgentMarkup +=
                    //             markup * adultsCount;
                    //         adultActivityPrice += markup;
                    //     }

                    //     adultActivityTotalPrice +=
                    //         adultActivityPrice * adultsCount;
                    //     if (attraction.bookingType === "booking") {
                    //         adultActivityTotalCost +=
                    //             activity.adultCost * adultsCount ||
                    //             0;
                    //     }
                    // }

                    // if (childrenCount > 0) {
                    //     if (!childActivityPrice) {
                    //         return sendErrorResponse(
                    //             res,
                    //             400,
                    //             "sorry, something went wrong with our end. please try again later"
                    //         );
                    //     }
                    //     if (specialB2bMarkup) {
                    //         let markup = 0;
                    //         if (specialB2bMarkup.markupType === "flat") {
                    //             markup = specialB2bMarkup.markup;
                    //         } else {
                    //             markup = (specialB2bMarkup.markup * childActivityPrice) / 100;
                    //         }
                    //         childActivityPrice += markup;
                    //     }

                    //     if (resellerToSubAgentMarkup) {
                    //         let markup = 0;
                    //         if (resellerToSubAgentMarkup.markupType === "flat") {
                    //             markup = resellerToSubAgentMarkup.markup;
                    //         } else {
                    //             markup =
                    //                 (resellerToSubAgentMarkup.markup *
                    //                     activity?.childActivityPrice) /
                    //                 100;
                    //         }
                    //         totalResellerMarkup +=
                    //             markup * childrenCount;
                    //         childActivityPrice += markup;
                    //     }

                    //     if (resellerToClientMarkup) {
                    //         let markup = 0;
                    //         if (resellerToClientMarkup.markupType === "flat") {
                    //             markup = resellerToClientMarkup.markup;
                    //         } else {
                    //             markup = (resellerToClientMarkup.markup * childActivityPrice) / 100;
                    //         }
                    //         totalSubAgentMarkup +=
                    //             markup * childrenCount;
                    //         childActivityPrice += markup;
                    //     }

                    //     childActivityTotalPrice +=
                    //         childActivityPrice * childrenCount;
                    //     if (attraction.bookingType === "booking") {
                    //         childActivityTotalCost +=
                    //             activity.childCost * childrenCount ||
                    //             0;
                    //     }
                    // }

                    selectedActivities[i].startTime = selectedActivities[i].slot.StartDateTime;
                    selectedActivities[i].endTime = selectedActivities[i].slot.EndDateTime;
                    selectedActivities[i].bookingReferenceNo = bookingId;
                }

                if (activity?.activityType === "transfer") {
                    if (selectedActivities[i]?.transferType === "shared") {
                        if (
                            activity.isSharedTransferAvailable === false ||
                            !sharedTransferPrice ||
                            !activity.sharedTransferCost
                        ) {
                            throw Error(
                                `${activity.name} activity doesn't have a shared transfer option`
                            );
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
                            throw Error(
                                `${activity.name} activity doesn't have a private transfer option`
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
                        throw Error(
                            `please select a valid transfer option ["shared", "private"] for ${activity.name}.`
                        );
                    }
                } else {
                    if (attraction.bookingType === "ticket" && !attraction.isApiConnected) {
                        let adultTicketError = false;
                        let childTicketError = false;

                        const RESERVATION_TIME = 10;
                        const adultTickets = await AttractionTicket.find({
                            activity: activity._id,
                            status: "ok",
                            ticketFor: "adult",
                            $and: [
                                {
                                    $or: [
                                        {
                                            validity: true,
                                            validTill: {
                                                $gte: new Date(
                                                    selectedActivities[i]?.date
                                                ).toISOString(),
                                            },
                                        },
                                        { validity: false },
                                    ],
                                },
                                {
                                    $or: [
                                        {
                                            reservationValidity: { $exists: true },
                                            reservationValidity: { $lte: moment().utc().valueOf() },
                                        },
                                        { reservationValidity: null },
                                        { reservationValidity: { $exists: false } },
                                    ],
                                },
                            ],
                        })
                            .limit(adultsCount)
                            .lean();
                        if (adultTickets?.length > 0) {
                            await AttractionTicket.updateMany(
                                { _id: { $in: adultTickets.map((ticket) => ticket._id) } },
                                {
                                    orderRefNumber: referenceNumber,
                                    reservationValidity: moment()
                                        .add(RESERVATION_TIME, "minutes")
                                        .utc()
                                        .valueOf(),
                                }
                            );
                        }

                        const childrenTickets =
                            childrenCount > 0
                                ? await AttractionTicket.find({
                                      activity: activity._id,
                                      status: "ok",
                                      ticketFor: "child",
                                      $and: [
                                          {
                                              $or: [
                                                  {
                                                      validity: true,
                                                      validTill: {
                                                          $gte: new Date(
                                                              selectedActivities[i]?.date
                                                          ).toISOString(),
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
                                  })
                                      .limit(childrenCount)
                                      .lean()
                                : [];

                        if (childrenTickets?.length > 0) {
                            await AttractionTicket.updateMany(
                                { _id: { $in: childrenTickets.map((ticket) => ticket._id) } },
                                {
                                    orderRefNumber: referenceNumber,
                                    reservationValidity: moment()
                                        .add(RESERVATION_TIME, "minutes")
                                        .utc()
                                        .valueOf(),
                                }
                            );
                        }

                        let commonTickets = [];
                        if (
                            adultTickets?.length < adultsCount ||
                            childrenTickets?.length < childrenCount
                        ) {
                            let commonLimit =
                                adultsCount -
                                adultTickets?.length +
                                (childrenCount - childrenTickets?.length);
                            commonTickets = await AttractionTicket.find({
                                activity: activity._id,
                                status: "ok",
                                ticketFor: "common",
                                $and: [
                                    {
                                        $or: [
                                            {
                                                validity: true,
                                                validTill: {
                                                    $gte: new Date(
                                                        selectedActivities[i]?.date
                                                    ).toISOString(),
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
                            })
                                .limit(commonLimit)
                                .lean();
                            if (commonTickets?.length > 0) {
                                await AttractionTicket.updateMany(
                                    { _id: { $in: commonTickets.map((ticket) => ticket._id) } },
                                    {
                                        orderRefNumber: referenceNumber,
                                        reservationValidity: moment()
                                            .add(RESERVATION_TIME, "minutes")
                                            .utc()
                                            .valueOf(),
                                    }
                                );
                            }
                        }

                        let commonTicketsCount = commonTickets?.length;
                        if (adultTickets?.length < adultsCount) {
                            if (commonTicketsCount - adultTickets?.length < adultsCount) {
                                adultTicketError = true;
                            } else {
                                commonTicketsCount -= adultsCount - adultTickets?.length;
                            }
                        }

                        if (childrenTickets?.length < childrenCount) {
                            if (commonTicketsCount - childrenTickets?.length < childrenCount) {
                                childTicketError = true;
                            } else {
                                commonTicketsCount -= childrenCount - childrenTickets?.length;
                            }
                        }

                        if (adultTicketError || childTicketError) {
                            throw Error(
                                `${adultTicketError ? "adult tickets" : ""}${
                                    adultTicketError && childTicketError ? " and " : ""
                                }${childTicketError ? "child tickets" : ""} sold out`
                            );
                        }
                    }

                    if (activity.base !== "hourly") {
                        if (!adultActivityPrice) {
                            throw Error(
                                `sorry, ${activity.name} activity not available at this momemnt`
                            );
                        }

                        if (specialB2bMarkup) {
                            let markup = 0;
                            if (specialB2bMarkup.markupType === "flat") {
                                markup = specialB2bMarkup.markup;
                            } else {
                                markup = (specialB2bMarkup.markup * adultActivityPrice) / 100;
                            }
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

                            totalResellerMarkup += markup * adultsCount;
                            adultActivityPrice += markup;
                        }

                        if (resellerToClientMarkup) {
                            let markup = 0;
                            if (resellerToClientMarkup.markupType === "flat") {
                                markup = resellerToClientMarkup.markup;
                            } else {
                                markup = (resellerToClientMarkup.markup * adultActivityPrice) / 100;
                            }
                            totalSubAgentMarkup += markup * adultsCount;
                            adultActivityPrice += markup;
                        }

                        adultActivityTotalPrice += adultActivityPrice * adultsCount;
                        if (attraction.bookingType === "booking") {
                            adultActivityTotalCost += activity.adultCost * adultsCount || 0;
                        }

                        if (childrenCount > 0) {
                            if (!childActivityPrice) {
                                throw Error(
                                    `sorry, ${activity.name} activity not available at this momemnt`
                                );
                            }
                            if (specialB2bMarkup) {
                                let markup = 0;
                                if (specialB2bMarkup.markupType === "flat") {
                                    markup = specialB2bMarkup.markup;
                                } else {
                                    markup = (specialB2bMarkup.markup * childActivityPrice) / 100;
                                }
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
                                totalResellerMarkup += markup * childrenCount;
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
                                totalSubAgentMarkup += markup * childrenCount;
                                childActivityPrice += markup;
                            }

                            childActivityTotalPrice += childActivityPrice * childrenCount;
                            if (attraction.bookingType === "booking") {
                                childActivityTotalCost += activity.childCost * childrenCount || 0;
                            }
                        }

                        if (
                            Number(selectedActivities[i]?.infantCount) > 0 &&
                            infantActivityPrice > 0
                        ) {
                            if (specialB2bMarkup) {
                                let markup = 0;
                                if (specialB2bMarkup.markupType === "flat") {
                                    markup = specialB2bMarkup.markup;
                                } else {
                                    markup = (specialB2bMarkup.markup * infantActivityPrice) / 100;
                                }
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
                            throw Error(
                                `sorry, ${activity.name} activity not available at this momemnt`
                            );
                        }

                        if (specialB2bMarkup) {
                            let markup = 0;
                            if (specialB2bMarkup.markupType === "flat") {
                                markup = specialB2bMarkup.markup;
                            } else {
                                markup = (specialB2bMarkup.markup * hourlyActivityPrice) / 100;
                            }
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

                            totalResellerMarkup += markup * adultsCount;
                            hourlyActivityPrice += markup;
                        }

                        if (resellerToClientMarkup) {
                            let markup = 0;
                            if (resellerToClientMarkup.markupType === "flat") {
                                markup = resellerToClientMarkup.markup;
                            } else {
                                markup = (resellerToClientMarkup.markup * adultActivityPrice) / 100;
                            }
                            totalSubAgentMarkup += markup * adultsCount;
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
                            throw Error(
                                `${activity.name} activity doesn't have a shared transfer option`
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
                            throw Error(
                                `${activity.name} activity doesn't have a private transfer option`
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

                let promoDiscount = 0;
                if (activity?.isB2bPromoCode === true && activity?.b2bPromoAmountAdult) {
                    if (!selectedActivities[i]?.isPromoAdded) {
                        if (activity?.activityType === "transfer" && activity?.base === "person") {
                            promoDiscount = privateTransfers.reduce((total, pvt) => {
                                return total + Number(pvt.count * activity?.b2bPromoAmountAdult);
                            }, 0);
                        } else if (
                            activity?.activityType === "transfer" &&
                            activity?.base === "houlry"
                        ) {
                            promoDiscount = privateTransfers.reduce((total, pvt) => {
                                return (
                                    total +
                                    Number(
                                        pvt.count *
                                            activity?.b2bPromoAmountAdult *
                                            selectedActivities[i]?.hoursCount
                                    )
                                );
                            }, 0);
                        } else {
                            promoDiscount =
                                Number(activity?.b2bPromoAmountAdult) * adultsCount +
                                Number(activity?.b2bPromoAmountChild) * (childrenCount || 0);
                        }
                    }
                } else {
                    if (selectedActivities[i]?.isPromoAdded) {
                        throw Error(`promotional discount not available for ${activity.name}`);
                    }
                }

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
                    totalVat +
                    Number(promoDiscount);

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
                selectedActivities[i].totalMarkup = totalResellerMarkup + totalSubAgentMarkup;
                selectedActivities[i].markups = markups;

                totalAmount += selectedActivities[i].grandTotal;
            }

            return { totalAmount, selectedActivities };
        } catch (err) {
            await AttractionTicket.updateMany(
                { orderRefNumber: referenceNumber },
                {
                    orderRefNumber: "",
                    reservationValidity: null,
                }
            );
            throw err;
        }
    },

    // Attraciton Order completed helper function
    attractionOrderCompleteHelper: async ({ attractionOrder }) => {
        try {
            console.log("call reached here", attractionOrder.activities?.length);
            let errors = [];

            for (let i = 0; i < attractionOrder.activities?.length; i++) {
                console.log("activvity type 1 ", attractionOrder?.activities[i]?.bookingType);
                const activity = await AttractionActivity.findOne({
                    _id: attractionOrder.activities[i].activity,
                })
                    .populate("attraction")
                    .lean();

                let totalPurchaseCost = attractionOrder.activities[i].totalCost;

                if (
                    activity.attraction._id == "63afca1b5896ed6d0f297449" &&
                    activity.attraction.isApiConnected &&
                    activity.isApiSync == true
                ) {
                    let data;
                    try {
                        data = await createDubaiParkOrder(
                            activity.attraction.connectedApi,
                            attractionOrder,
                            attractionOrder.activities[i],
                            activity
                        );
                    } catch (err) {
                        attractionOrder.activities[i].status = "failed";
                        errors.push({
                            message: `${activity.name} not booked!`,
                            error: err?.message || err,
                        });
                        continue;
                    }

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

                    let confirmResponse;
                    try {
                        confirmResponse = await confirmTicket(
                            attractionOrder.name,
                            attractionOrder?.activities[i]?.bookingReferenceNo,
                            voucherNumber,
                            attractionOrder?.reseller,
                            attractionOrder?.referenceNumber
                        );
                    } catch (err) {
                        attractionOrder.activities[i].status = "failed";
                        errors.push({
                            message: `${activity.name} not booked!`,
                            error: err?.message || err,
                        });
                        continue;
                    }

                    // let adultTicketIds = [];
                    // let childTicketIds = [];
                    // for (let j = 0; j < confirmResponse.adultTicket.length; j++) {
                    //     const ticket = {
                    //         ticketNo: confirmResponse.adultTicket[j],
                    //         lotNo: attractionOrder.activities[i].bookingReferenceNo,
                    //         ticketFor: "adult",
                    //         activity: activity._id,
                    //         status: "used",
                    //         ticketCost: activity.adultPrice,
                    //     };
                    //     adultTicketIds.push(ticket);
                    // }

                    // // Loop through childTickets array
                    // for (let k = 0; k < confirmResponse.childTicket.length; k++) {
                    //     const ticket = {
                    //         ticketNo: confirmResponse.childTicket[k],
                    //         lotNo: attractionOrder.activities[i].bookingReferenceNo,
                    //         ticketFor: "child",
                    //         activity: activity._id,
                    //         status: "used",
                    //         ticketCost: activity.childPrice,
                    //     };
                    //     childTicketIds.push(ticket);
                    // }

                    // Update attractionOrder with ticket data
                    // attractionOrder.activities[i].adultTickets = adultTicketIds;
                    // attractionOrder.activities[i].childTickets = childTicketIds;
                    // console.log(confirmResponse, "confirmResponse");

                    // console.log(adultTicketIds, "adultTicketIds");

                    const burjKhalifaLog = await BurjKhalifaLog.findOneAndUpdate(
                        {
                            bookingReferenceNo: attractionOrder?.activities[i]?.bookingReferenceNo,
                        },
                        {
                            voucherNumber: voucherNumber,
                            bookingConfirmationNumber: confirmResponse?.OrderNo || null,
                            bookingDetails: confirmResponse,
                        },
                        {
                            new: true,
                            upsert: false, // Set to true if you want to create a new document if not found
                        }
                    );

                    attractionOrder.activities[i].voucherNumber = voucherNumber;
                    attractionOrder.activities[i].bookingConfirmationNumber =
                        confirmResponse.OrderNo;
                    attractionOrder.activities[i].status = "confirmed";
                } else {
                    if (attractionOrder?.activities[i]?.bookingType === "ticket") {
                        let adultTickets = [];
                        let childTickets = [];
                        let infantTickets = [];
                        try {
                            console.log(
                                "activvity type 2 ",
                                attractionOrder?.activities[i]?.bookingType
                            );

                            for (let tc = 0; tc < attractionOrder.activities[i].adultsCount; tc++) {
                                let adultTicket = await AttractionTicket.findOneAndUpdate(
                                    {
                                        activity: attractionOrder.activities[i].activity,
                                        status: "ok",
                                        $and: [
                                            {
                                                $or: [
                                                    { ticketFor: "adult" },
                                                    { ticketFor: "common" },
                                                ],
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
                                            {
                                                $or: [
                                                    {
                                                        orderRefNumber:
                                                            attractionOrder?.referenceNumber,
                                                    },
                                                    { orderRefNumber: null },
                                                    { orderRefNumber: { $exists: false } },
                                                ],
                                            },
                                        ],
                                    },
                                    { status: "used" }
                                );
                                if (!adultTicket) {
                                    throw Error("tickets sold out.");
                                }
                                adultTickets.push(adultTicket);
                            }

                            const adultTicketsIds = adultTickets.map((ticket) => {
                                totalPurchaseCost += ticket.ticketCost;
                                return ticket?._id;
                            });
                            for (
                                let tc = 0;
                                tc < attractionOrder.activities[i].childrenCount;
                                tc++
                            ) {
                                let childTicket = await AttractionTicket.findOneAndUpdate(
                                    {
                                        activity: attractionOrder.activities[i].activity,
                                        status: "ok",
                                        $and: [
                                            {
                                                $or: [
                                                    { ticketFor: "child" },
                                                    { ticketFor: "common" },
                                                ],
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
                                            {
                                                $or: [
                                                    {
                                                        orderRefNumber:
                                                            attractionOrder?.referenceNumber,
                                                    },
                                                    { orderRefNumber: null },
                                                    { orderRefNumber: { $exists: false } },
                                                ],
                                            },
                                        ],
                                    },
                                    { status: "used" }
                                );
                                if (!childTicket) {
                                    throw Error("tickets sold out.");
                                }
                                childTickets.push(childTicket);
                            }

                            const childTicketsIds = childTickets.map((ticket) => {
                                totalPurchaseCost += ticket.ticketCost;
                                return ticket?._id;
                            });
                            if (
                                activity.infantPrice > 0 &&
                                attractionOrder.activities[i].infantCount > 0
                            ) {
                                for (
                                    let tc = 0;
                                    tc < attractionOrder.activities[i].infantCount;
                                    tc++
                                ) {
                                    let infantTicket = await AttractionTicket.findOneAndUpdate(
                                        {
                                            activity: attractionOrder.activities[i].activity,
                                            status: "ok",
                                            $and: [
                                                {
                                                    $or: [
                                                        { ticketFor: "infant" },
                                                        { ticketFor: "common" },
                                                    ],
                                                },
                                                {
                                                    $or: [
                                                        {
                                                            validity: true,
                                                            validTill: {
                                                                $gte: new Date(
                                                                    attractionOrder.activities[
                                                                        i
                                                                    ].date
                                                                ).toISOString(),
                                                            },
                                                        },
                                                        { validity: false },
                                                    ],
                                                },
                                                {
                                                    $or: [
                                                        {
                                                            orderRefNumber:
                                                                attractionOrder?.referenceNumber,
                                                        },
                                                        { orderRefNumber: null },
                                                        { orderRefNumber: { $exists: false } },
                                                    ],
                                                },
                                            ],
                                        },
                                        { status: "used" }
                                    );
                                    if (!infantTicket) {
                                        throw Error("tickets sold out.");
                                    }
                                    infantTickets.push(infantTicket);
                                }
                                const infantTicketsIds = infantTickets.map((ticket) => {
                                    totalPurchaseCost += ticket.ticketCost;
                                    return ticket?._id;
                                });
                            }
                            console.log("call reached 3 ");

                            attractionOrder.activities[i].status = "confirmed";
                            attractionOrder.activities[i].adultTickets = adultTickets;
                            attractionOrder.activities[i].childTickets = childTickets;
                            attractionOrder.activities[i].infantTickets = infantTickets;

                            await updateTicketCountHelper({
                                attraction: attractionOrder.activities[i].attraction,
                                activity: attractionOrder.activities[i].activity._id,
                                date: attractionOrder.activities[i].date,
                            });
                        } catch (err) {
                            attractionOrder.activities[i].status = "failed";
                            attractionOrder.activities[i].adultTickets = [];
                            attractionOrder.activities[i].childTickets = [];
                            attractionOrder.activities[i].infantTickets = [];
                            await AttractionTicket.updateMany(
                                {
                                    _id: {
                                        $in: [
                                            ...adultTickets,
                                            ...childTickets,
                                            ...infantTickets,
                                        ]?.map((ticket) => ticket?._id),
                                    },
                                },
                                { status: "ok" }
                            );
                            errors.push({
                                message: `${activity.name} not booked!`,
                                error: err?.message || err,
                            });
                            console.log(err);
                            throw err;

                            // continue;
                        }
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
        } catch (err) {
            throw err;
        }
    },

    getB2BAllOrdersApi: async ({
        skip = 0,
        limit = 10,
        bookingType,
        orderedBy,
        status,
        referenceNo,
        resellerId,
        agentCode,
        dateFrom,
        dateTo,
        attraction,
        activity,
        travellerEmail,
    }) => {
        try {
            const filters1 = {
                "activities.status": {
                    $in: ["pending", "booked", "confirmed", "cancelled"],
                },
            };

            const filters2 = {};
            if (resellerId) {
                filters1.reseller = Types.ObjectId(resellerId);
            }
            if (bookingType && bookingType !== "") {
                filters1["activities.bookingType"] = bookingType;
            }
            if (referenceNo && referenceNo !== "") {
                filters1.agentReferenceNumber = referenceNo;
            }
            if (status && status !== "") {
                filters1["activities.status"] = status;
            }
            if (orderedBy && orderedBy !== "") {
                filters1.orderedBy = orderedBy;
            }
            if (agentCode && agentCode !== "") {
                filters1["reseller.agentCode"] = Number(agentCode);
            }
            if (dateFrom && dateFrom !== "" && dateTo && dateTo !== "") {
                filters1.$and = [
                    { "activities.date": { $gte: new Date(dateFrom) } },
                    { "activities.date": { $lte: new Date(dateTo) } },
                ];
            } else if (dateFrom && dateFrom !== "") {
                filters1["activities.date"] = { $gte: new Date(dateFrom) };
            } else if (dateTo && dateTo !== "") {
                filters1["activities.date"] = { $lte: new Date(dateTo) };
            }

            if (attraction && attraction !== "") {
                if (isValidObjectId(attraction)) {
                    filters2["attraction._id"] = Types.ObjectId(attraction);
                } else {
                    filters2["attraction.title"] = {
                        $regex: attraction,
                        $options: "i",
                    };
                }
            }

            if (activity && activity !== "") {
                if (isValidObjectId(activity)) {
                    filters2["activities.activity._id"] = Types.ObjectId(activity);
                } else {
                    filters2["activities.activity.name"] = {
                        $regex: activity,
                        $options: "i",
                    };
                }
            }

            const orders = await B2BAttractionOrder.aggregate([
                { $sort: { createdAt: -1 } },
                {
                    $unwind: "$activities",
                },
                {
                    $match: filters1,
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
                        from: "countries",
                        localField: "country",
                        foreignField: "_id",
                        as: "country",
                    },
                },
                {
                    $lookup: {
                        from: "resellers",
                        localField: "reseller",
                        foreignField: "_id",
                        as: "reseller",
                    },
                },
                {
                    $set: {
                        "activities.activity": {
                            $arrayElemAt: ["$activities.activity", 0],
                        },
                        attraction: {
                            $arrayElemAt: ["$attraction", 0],
                        },
                        country: { $arrayElemAt: ["$country", 0] },
                        reseller: { $arrayElemAt: ["$reseller", 0] },
                    },
                },
                {
                    $lookup: {
                        from: "destinations",
                        localField: "attraction.destination",
                        foreignField: "_id",
                        as: "activities.destination",
                    },
                },
                {
                    $set: {
                        "activities.destination": {
                            $arrayElemAt: ["$activities.destination", 0],
                        },
                    },
                },
                {
                    $match: filters2,
                },
                {
                    $project: {
                        totalOffer: 1,
                        totalAmount: 1,
                        name: 1,
                        email: 1,
                        phoneNumber: 1,
                        country: 1,
                        orderStatus: 1,
                        merchant: 1,
                        paymentStatus: 1,
                        paymentOrderId: 1,
                        createdAt: 1,
                        updatedAt: 1,
                        attraction: {
                            _id: 1,
                            title: 1,
                            images: 1,
                            logo: 1,
                        },
                        activities: {
                            activity: {
                                _id: 1,
                                name: 1,
                                description: 1,
                            },
                            destination: {
                                name: 1,
                            },
                            bookingType: 1,
                            date: 1,
                            adultsCount: 1,
                            childrenCount: 1,
                            infantCount: 1,
                            adultCost: 1,
                            childCost: 1,
                            hoursCount: 1,
                            transferType: 1,
                            grandTotal: 1,
                            adultTickets: 1,
                            childTickets: 1,
                            status: 1,
                            isRefunded: 1,
                            profit: 1,
                            bookingConfirmationNumber: 1,
                            drivers: 1,
                            _id: 1,
                            note: 1,
                            privateTransfers: 1,
                        },
                        referenceNumber: 1,
                        agentReferenceNumber: 1,
                        reseller: {
                            companyName: 1,
                            email: 1,
                            website: 1,
                            agentCode: 1,
                        },
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalOrders: { $sum: 1 },
                        data: { $push: "$$ROOT" },
                    },
                },
                {
                    $project: {
                        totalOrders: 1,
                        data: {
                            $slice: ["$data", Number(limit) * Number(skip), Number(limit)],
                        },
                    },
                },
            ]);

            return {
                result: orders[0],
                skip: Number(skip),
                limit: Number(limit),
            };
        } catch (err) {
            throw err;
        }
    },

    attractionPromoCodeHelper: async ({ reseller, selectedActivities }) => {
        try {
            let totalAmount = 0;
            for (let i = 0; i < selectedActivities?.length; i++) {
                if (!isValidObjectId(selectedActivities[i]?.activity)) {
                    throw Error(`"selectedActivities[${i}].activity", Invalid activity id`);
                }
                if (
                    selectedActivities[i]?.adultsCount < 1 &&
                    selectedActivities[i]?.childrenCount < 1
                ) {
                    throw Error(
                        `selectedActivity ${i} atleast should have  one adult or children count `
                    );
                }

                const activity = await AttractionActivity.findOne({
                    _id: selectedActivities[i]?.activity,
                    isDeleted: false,
                });
                if (!activity) {
                    throw Error(`"selectedActivities[${i}].activity", Activity not found!`);
                }

                const attraction = await Attraction.findOne({
                    _id: activity.attraction,
                    isDeleted: false,
                    isB2bActive: true,
                });
                if (!attraction) {
                    throw Error(`${activity.name}'s attraction not found!`);
                }

                let specialB2bMarkup;
                let profileMarkup;
                // taking profile markup, it is only available for agents
                // not for sub-agents
                if (reseller.role === "reseller") {
                    profileMarkup = await B2BMarkupProfile.findOne({
                        resellerId: reseller?._id,
                    });
                } else {
                    profileMarkup = await B2BMarkupProfile.findOne({
                        resellerId: reseller?.referredBy,
                    });
                }

                if (profileMarkup) {
                    specialB2bMarkup = profileMarkup?.activities.find(
                        (markup) => markup?.activity?.toString() == activity?._id.toString()
                    );
                }

                if (moment(selectedActivities[i]?.date).isBefore(moment(), "day")) {
                    throw Error(`"selectedActivities[${i}].date" the date must be today or future`);
                }

                if (attraction.bookingType === "booking" && attraction.bookingPriorDays > 0) {
                    if (
                        moment(selectedActivities[i]?.date).isBefore(
                            moment().add(Number(attraction.bookingPriorDays), "day"),
                            "day"
                        )
                    ) {
                        throw Error(
                            `"selectedActivities[${i}].date" must be ${attraction.bookingPriorDays} days prior`
                        );
                    }
                }

                if (
                    attraction.isCustomDate === true &&
                    (moment(selectedActivities[i]?.date).isBefore(
                        moment(attraction.startDate),
                        "day"
                    ) ||
                        moment(selectedActivities[i]?.date).isAfter(
                            moment(attraction.endDate),
                            "day"
                        ))
                ) {
                    throw Error(
                        `${
                            activity?.name
                        } is not avaialble on your date. Please select a date between ${moment(
                            attraction?.startDate
                        ).format("D MMM YYYY")} and ${moment(attraction?.endDate).format(
                            "D MMM YYYY"
                        )} `
                    );
                }

                if (activity.base === "hourly" && !selectedActivities[i]?.hoursCount) {
                    throw Error(`hours count is required for ${activity.name}`);
                }
                if (attraction.bookingType === "ticket" && activity.activityType === "transfer") {
                    throw Error(`sorry, ${activity.name} activity not available at this momemnt`);
                }
                if (attraction.bookingType === "ticket" && activity.base === "hourly") {
                    throw Error(`sorry, ${activity.name} activity not available at this momemnt`);
                }

                const selectedDay = dayNames[new Date(selectedActivities[i]?.date).getDay()];

                const objIndex = attraction.availability?.findIndex((item) => {
                    return item?.day?.toLowerCase() === selectedDay?.toLowerCase();
                });

                if (objIndex === -1 || attraction.availability[objIndex]?.isEnabled === false) {
                    throw Error(`sorry, ${activity?.name} is off on ${selectedDay}`);
                }

                for (let j = 0; j < attraction.offDates?.length; j++) {
                    const { from, to } = attraction.offDates[j];
                    if (
                        moment(selectedActivities[i]?.date).isSameOrAfter(moment(from), "day") &&
                        moment(selectedActivities[i]?.date).isSameOrBefore(moment(to), "day")
                    ) {
                        throw Error(
                            `${activity?.name} is off between ${moment(from).format(
                                "D MMM YYYY"
                            )} and ${moment(to).format("D MMM YYYY")} `
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
                let totalResellerMarkup = 0;
                let totalSubAgentMarkup = 0;
                let resellerToSubAgentMarkup;
                let resellerToClientMarkup;
                let adultsCount = Number(selectedActivities[i]?.adultsCount) || 0;
                let childrenCount = Number(selectedActivities[i]?.childrenCount) || 0;
                let totalPax = adultsCount + childrenCount;

                if (reseller.role === "sub-agent") {
                    resellerToSubAgentMarkup = await B2BSubAgentAttractionMarkup.findOne({
                        resellerId: reseller?._id,
                        activityId: activity?._id,
                    });
                }

                resellerToClientMarkup = await B2BClientAttractionMarkup.findOne({
                    resellerId: reseller?._id,
                    activityId: activity?._id,
                });

                if (
                    attraction.connectedApi == "63f0a47b479d4a0376fe12f4" &&
                    attraction.isApiConnected &&
                    attraction.bookingType === "booking"
                ) {
                    let ticketData = await getTicketType(
                        selectedActivities[i].slot,
                        activity.productCode,
                        selectedActivities[i].adultsCount,
                        selectedActivities[i].childrenCount,
                        reseller,
                        referenceNumber
                    );

                    for (k = 0; k < ticketData.length; k++) {
                        if (ticketData[k].c_TicketTypeCode === "AD") {
                            adultActivityPrice = Number(ticketData[k].i_TicketPrice);
                            activity.adultCost = Number(ticketData[k].i_TicketPrice);
                        } else if (ticketData[k].c_TicketTypeCode === "CH") {
                            childActivityPrice = Number(ticketData[k].i_TicketPrice);
                            activity.childCost = Number(ticketData[k].i_TicketPrice);
                        }
                    }

                    // if (adultsCount > 0) {
                    //     if (!adultActivityPrice) {
                    //         return sendErrorResponse(
                    //             res,
                    //             500,
                    //             "sorry, something went wrong with our end. please try again later"
                    //         );
                    //     }

                    // if (specialB2bMarkup) {
                    //     let markup = 0;
                    //     if (specialB2bMarkup.markupType === "flat") {
                    //         markup = Number(specialB2bMarkup.markup);
                    //     } else {
                    //         markup = Number(specialB2bMarkup.markup * adultActivityPrice) / 100;
                    //     }
                    //     adultActivityPrice += markup;
                    // }

                    // console.log(adultActivityPrice, "adultActivityPrice2");

                    //     if (resellerToSubAgentMarkup) {
                    //         let markup = 0;
                    //         if (resellerToSubAgentMarkup.markupType === "flat") {
                    //             markup = resellerToSubAgentMarkup.markup;
                    //         } else {
                    //             markup =
                    //                 (resellerToSubAgentMarkup.markup *
                    //                     activity.adultActivityPrice) /
                    //                 100;
                    //         }

                    //         totalResellerMarkup +=
                    //             markup * adultsCount;
                    //         adultActivityPrice += markup;
                    //     }

                    //     if (resellerToClientMarkup) {
                    //         let markup = 0;
                    //         if (resellerToClientMarkup.markupType === "flat") {
                    //             markup = resellerToClientMarkup.markup;
                    //         } else {
                    //             markup = (resellerToClientMarkup.markup * adultActivityPrice) / 100;
                    //         }
                    //         totalSubAgentMarkup +=
                    //             markup * adultsCount;
                    //         adultActivityPrice += markup;
                    //     }

                    //     adultActivityTotalPrice +=
                    //         adultActivityPrice * adultsCount;
                    //     if (attraction.bookingType === "booking") {
                    //         adultActivityTotalCost +=
                    //             activity.adultCost * adultsCount ||
                    //             0;
                    //     }
                    // }

                    // if (childrenCount > 0) {
                    //     if (!childActivityPrice) {
                    //         return sendErrorResponse(
                    //             res,
                    //             400,
                    //             "sorry, something went wrong with our end. please try again later"
                    //         );
                    //     }
                    //     if (specialB2bMarkup) {
                    //         let markup = 0;
                    //         if (specialB2bMarkup.markupType === "flat") {
                    //             markup = specialB2bMarkup.markup;
                    //         } else {
                    //             markup = (specialB2bMarkup.markup * childActivityPrice) / 100;
                    //         }
                    //         childActivityPrice += markup;
                    //     }

                    //     if (resellerToSubAgentMarkup) {
                    //         let markup = 0;
                    //         if (resellerToSubAgentMarkup.markupType === "flat") {
                    //             markup = resellerToSubAgentMarkup.markup;
                    //         } else {
                    //             markup =
                    //                 (resellerToSubAgentMarkup.markup *
                    //                     activity?.childActivityPrice) /
                    //                 100;
                    //         }
                    //         totalResellerMarkup +=
                    //             markup * childrenCount;
                    //         childActivityPrice += markup;
                    //     }

                    //     if (resellerToClientMarkup) {
                    //         let markup = 0;
                    //         if (resellerToClientMarkup.markupType === "flat") {
                    //             markup = resellerToClientMarkup.markup;
                    //         } else {
                    //             markup = (resellerToClientMarkup.markup * childActivityPrice) / 100;
                    //         }
                    //         totalSubAgentMarkup +=
                    //             markup * childrenCount;
                    //         childActivityPrice += markup;
                    //     }

                    //     childActivityTotalPrice +=
                    //         childActivityPrice * childrenCount;
                    //     if (attraction.bookingType === "booking") {
                    //         childActivityTotalCost +=
                    //             activity.childCost * childrenCount ||
                    //             0;
                    //     }
                    // }

                    selectedActivities[i].startTime = selectedActivities[i].slot.StartDateTime;
                    selectedActivities[i].endTime = selectedActivities[i].slot.EndDateTime;
                    selectedActivities[i].bookingReferenceNo = bookingId;
                }

                if (activity?.activityType === "transfer") {
                    if (selectedActivities[i]?.transferType === "shared") {
                        if (
                            activity.isSharedTransferAvailable === false ||
                            !sharedTransferPrice ||
                            !activity.sharedTransferCost
                        ) {
                            throw Error(
                                `${activity.name} activity doesn't have a shared transfer option`
                            );
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
                            throw Error(
                                `${activity.name} activity doesn't have a private transfer option`
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
                        throw Error(
                            `please select a valid transfer option ["shared", "private"] for ${activity.name}.`
                        );
                    }
                } else {
                    if (activity.base !== "hourly") {
                        if (!adultActivityPrice) {
                            throw Error(
                                `sorry, ${activity.name} activity not available at this momemnt`
                            );
                        }

                        if (specialB2bMarkup) {
                            let markup = 0;
                            if (specialB2bMarkup.markupType === "flat") {
                                markup = specialB2bMarkup.markup;
                            } else {
                                markup = (specialB2bMarkup.markup * adultActivityPrice) / 100;
                            }
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

                            totalResellerMarkup += markup * adultsCount;
                            adultActivityPrice += markup;
                        }

                        if (resellerToClientMarkup) {
                            let markup = 0;
                            if (resellerToClientMarkup.markupType === "flat") {
                                markup = resellerToClientMarkup.markup;
                            } else {
                                markup = (resellerToClientMarkup.markup * adultActivityPrice) / 100;
                            }
                            totalSubAgentMarkup += markup * adultsCount;
                            adultActivityPrice += markup;
                        }

                        adultActivityTotalPrice += adultActivityPrice * adultsCount;
                        if (attraction.bookingType === "booking") {
                            adultActivityTotalCost += activity.adultCost * adultsCount || 0;
                        }

                        if (childrenCount > 0) {
                            if (!childActivityPrice) {
                                throw Error(
                                    `sorry, ${activity.name} activity not available at this momemnt`
                                );
                            }
                            if (specialB2bMarkup) {
                                let markup = 0;
                                if (specialB2bMarkup.markupType === "flat") {
                                    markup = specialB2bMarkup.markup;
                                } else {
                                    markup = (specialB2bMarkup.markup * childActivityPrice) / 100;
                                }
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
                                totalResellerMarkup += markup * childrenCount;
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
                                totalSubAgentMarkup += markup * childrenCount;
                                childActivityPrice += markup;
                            }

                            childActivityTotalPrice += childActivityPrice * childrenCount;
                            if (attraction.bookingType === "booking") {
                                childActivityTotalCost += activity.childCost * childrenCount || 0;
                            }
                        }

                        if (
                            Number(selectedActivities[i]?.infantCount) > 0 &&
                            infantActivityPrice > 0
                        ) {
                            if (specialB2bMarkup) {
                                let markup = 0;
                                if (specialB2bMarkup.markupType === "flat") {
                                    markup = specialB2bMarkup.markup;
                                } else {
                                    markup = (specialB2bMarkup.markup * infantActivityPrice) / 100;
                                }
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
                            throw Error(
                                `sorry, ${activity.name} activity not available at this momemnt`
                            );
                        }

                        if (specialB2bMarkup) {
                            let markup = 0;
                            if (specialB2bMarkup.markupType === "flat") {
                                markup = specialB2bMarkup.markup;
                            } else {
                                markup = (specialB2bMarkup.markup * hourlyActivityPrice) / 100;
                            }
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

                            totalResellerMarkup += markup * adultsCount;
                            hourlyActivityPrice += markup;
                        }

                        if (resellerToClientMarkup) {
                            let markup = 0;
                            if (resellerToClientMarkup.markupType === "flat") {
                                markup = resellerToClientMarkup.markup;
                            } else {
                                markup = (resellerToClientMarkup.markup * adultActivityPrice) / 100;
                            }
                            totalSubAgentMarkup += markup * adultsCount;
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
                            throw Error(
                                `${activity.name} activity doesn't have a shared transfer option`
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
                            throw Error(
                                `${activity.name} activity doesn't have a private transfer option`
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

                let promoDiscount = 0;
                if (activity?.isB2bPromoCode === true && activity?.b2bPromoAmountAdult) {
                    if (!selectedActivities[i]?.isPromoAdded) {
                        promoDiscount =
                            Number(activity?.b2bPromoAmountAdult) * adultsCount +
                            Number(activity?.b2bPromoAmountChild) * (childrenCount || 0);
                    }
                } else {
                    if (selectedActivities[i]?.isPromoAdded) {
                        throw Error(`promotional discount not available for ${activity.name}`);
                    }
                }

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
                    totalVat +
                    Number(promoDiscount);

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
                selectedActivities[i].totalMarkup = totalResellerMarkup + totalSubAgentMarkup;
                selectedActivities[i].markups = markups;

                totalAmount += selectedActivities[i].grandTotal;
            }

            return { totalAmount };
        } catch (err) {
            await AttractionTicket.updateMany(
                { orderRefNumber: referenceNumber },
                {
                    orderRefNumber: "",
                    reservationValidity: null,
                }
            );
            throw err;
        }
    },
};
