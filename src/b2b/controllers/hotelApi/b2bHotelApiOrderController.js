const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { createHotelLog } = require("../../helpers/hotel/hotelLogsHelpers");
const { hotelOrderSchema } = require("../../validations/hotel/hotelOrder.schema");
const {
    HotelAvailSearchResult,
    Hotel,
    RoomType,
    HotelAllocation,
    HotelBoardType,
} = require("../../../models/hotel");
const { Country } = require("../../../models");
const MarketStrategy = require("../../../admin/models/marketStrategy.model");
const { Reseller, B2BMarkupProfile, B2BWallet, B2BTransaction } = require("../../models");
const B2BClientHotelMarkup = require("../../models/hotel/b2bClientHotelMarkup.model");
const {
    B2BClientStarCategoryMarkup,
    B2BSubAgentStarCategoryMarkup,
    B2bHotelOrder,
    B2BHotelOrderPayment,
    B2BHotelOrderRefund,
    B2BHotelOrderCancellation,
} = require("../../models/hotel");
const { getSingleHotelBasePlanPriceORD } = require("../../helpers/hotel/hotelOrderHelpers");

const { generateUniqueString } = require("../../../utils");
const { sendOtpEmail } = require("../../helpers/global");
const {
    deductAmountFromWallet,
    checkWalletBalance,
    addMoneyToB2bWallet,
} = require("../../utils/wallet");

const {
    sendHotelReservationEmail,
    hotelOrderConfirmationEmail,
    hotelOrderCancellationRequestEmailForDpt,
    hotelOrderCancellationRequestEmailForReseller,
    cancellationConfirmationEmailToReseller,
} = require("../../helpers/hotel/email");

const {
    createHotelBedBooking,
    cancelHotelBedBooking,
} = require("../../helpers/hotel/hotelBedAvailabilityHelpers");

const { createHotelVoucher } = require("../../helpers/hotel/hotelVoucherHelpers");

module.exports = {
    createB2BHotelOrderApi: async (req, res) => {
        try {
            const { searchId, hotelId, contactDetails, rateKey, paymentMethod, travellerDetails } =
                req.body;

            createHotelLog({
                stepNumber: 2001,
                actionUrl: "",
                request: req.body,
                response: "",
                processId: searchId,
                userId: req.reseller?._id,
            });

            const { _, error } = hotelOrderSchema.validate(req.body);

            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(searchId)) {
                return sendErrorResponse(res, 400, "invalid search id");
            }

            const searchResult = await HotelAvailSearchResult.findOne({
                _id: searchId,
                resellerId: req.reseller?._id,
            });
            console.log(searchResult);
            if (!searchResult) {
                return sendErrorResponse(
                    res,
                    400,
                    "search result not found. please search availability again"
                );
            }

            createHotelLog({
                stepNumber: 2002,
                actionUrl: "",
                request: "",
                response: searchResult,
                processId: searchId,
                userId: req.reseller?._id,
            });

            if (new Date(searchResult.expiresIn.getTime()) < new Date().getTime()) {
                return res.status(400).json({
                    errorCode: "EXPIRIEDD",
                    message: "sorry search result expired, please search availability again",
                    hotelId,
                    fromDate: searchResult.fromDate,
                    toDate: searchResult.toDate,
                    rooms: searchResult.rooms,
                    nationality: searchResult.nationality || "",
                });
            }

            if (!isValidObjectId(hotelId)) {
                return sendErrorResponse(res, 400, "invalid hote id");
            }

            const hotel = await Hotel.findOne({
                _id: hotelId,
                isDeleted: false,
                isActive: true,
                isPublished: true,
            }).lean();

            if (!hotel) {
                return sendErrorResponse(res, 400, "hotel not found");
            }

            let totalGuests = 0;

            searchResult?.rooms?.map((item) => {
                totalGuests += item?.noOfAdults;
                totalGuests += item?.noOfChildren;
            });

            if (
                hotel.allGuestDetailsRequired === true &&
                travellerDetails?.length !== totalGuests
            ) {
                return sendErrorResponse(res, 400, "all guest details is mandatory");
            }

            if (
                hotel.allGuestDetailsRequired !== true &&
                travellerDetails?.length !== searchResult?.rooms?.length
            ) {
                return sendErrorResponse(
                    res,
                    400,
                    "one guest details from  each room is mandatory"
                );
            }

            let matchedRate;
            let matchedHotel;
            let matchedRoomType;

            for (let i = 0; i < searchResult?.hotels?.length; i++) {
                const hotel = searchResult?.hotels[i];

                if (hotel?.hotel?._id?.toString() === hotelId?.toString()) {
                    matchedHotel = hotel;
                    for (let j = 0; j < hotel?.rooms?.length; j++) {
                        for (let k = 0; k < hotel?.rooms[j]?.rates?.length; k++) {
                            const rate = hotel?.rooms[j]?.rates[k];

                            if (rate?.rateKey === rateKey) {
                                matchedRate = rate;
                                matchedRoomType = hotel?.rooms[j];
                                break;
                            }
                        }
                    }
                    break;
                }
            }
            console.log(matchedRate, matchedHotel, matchedRoomType, "alll matched details");
            if (!matchedRate || !matchedHotel || !matchedRoomType) {
                return sendErrorResponse(
                    res,
                    400,
                    "sorry rateKey not found, please search availabilty again"
                );
            }

            const rooms = searchResult?.rooms;

            if (!isValidObjectId(contactDetails?.country)) {
                return sendErrorResponse(res, 400, "invalid counrty id");
            }

            const country = await Country.findOne({
                _id: contactDetails?.country,
            });

            if (!country) {
                return sendErrorResponse(res, 400, "country not found");
            }

            const totalAdults = rooms?.reduce((a, b) => a + b?.noOfAdults, 0);
            const totalChildren = rooms?.reduce((a, b) => a + b?.noOfChildren, 0);

            let marketStrategy;
            let marketMarkup;

            if (req.reseller.role === "reseller") {
                marketStrategy = await MarketStrategy.findOne({
                    _id: req.reseller?.marketStrategy,
                });
            } else {
                const mainAgent = await Reseller.findById({
                    _id: req.reseller?.referredBy,
                })
                    .select("marketStrategy")
                    .lean();

                marketStrategy = await MarketStrategy.findOne({
                    _id: mainAgent?.marketStrategy,
                });
            }

            if (marketStrategy) {
                for (let mi = 0; mi < marketStrategy?.hotel?.length; mi++) {
                    for (let mj = 0; mj < marketStrategy?.hotel[mi]?.roomTypes?.length; mj++) {
                        let tempRmType = marketStrategy?.hotel[mi]?.roomTypes[mj];

                        if (
                            tempRmType?.roomTypeId?.toString() ===
                            matchedRoomType?.roomTypeId?.toString()
                        ) {
                            marketMarkup = tempRmType;
                            break;
                        }
                    }
                    break;
                }
            }

            if (!marketMarkup) {
                for (let mi = 0; mi < marketStrategy?.starCategory?.length; mi++) {
                    if (marketStrategy?.starCategory[mi]?.name === hotel?.starCategory) {
                        marketMarkup = marketStrategy?.starCategory[mi];
                        break;
                    }
                }
            }

            let profileMarkup;
            let b2bMarkup;

            if (req.reseller?.role === "reseller") {
                profileMarkup = await B2BMarkupProfile.findOne({
                    resellerId: req?.reseller?._if,
                });
            } else {
                profileMarkup = await B2BMarkupProfile.findOne({
                    resellerId: req.reseller?.referredBy,
                });
            }

            if (profileMarkup) {
                for (let mi = 0; mi < profileMarkup?.hotel?.length; mi++) {
                    if (profileMarkup?.hotel[mi]?.hotelId?.toString() === hotel?._id?.toString()) {
                        for (let mj = 0; mj < profileMarkup?.hotel[mi]?.roomTypes?.length; mj++) {
                            let tempRmType = profileMarkup?.hotel[mi]?.roomTypes[mj];
                            if (
                                tempRmType?.roomTypeId?.toString() ===
                                matchedRoomType?.roomTypeId?.toString()
                            ) {
                                b2bMarkup = tempRmType;
                                break;
                            }
                        }

                        break;
                    }
                }
                if (!b2bMarkup) {
                    for (let mi = 0; mi < profileMarkup?.starCategory?.length; mi++) {
                        if (profileMarkup?.starCategory[mi]?.name === hotel?.starCategory) {
                            b2bMarkup = profileMarkup?.starCategory[mi];
                            break;
                        }
                    }
                }
            }

            let clientMarkup = await B2BClientHotelMarkup.findOne({
                roomTypeId: matchedRoomType?.roomTypeId,
                resellerId: req.reseller?._id,
            });

            if (!clientMarkup) {
                clientMarkup = await B2BClientStarCategoryMarkup.findOne({
                    resellerId: req.reseller?._id,
                    name: hotel?.starCategory,
                });
            }

            let subAgentMarkup;

            if (req.reseller?.role === "sub-agent") {
                subAgentMarkup = await B2bSubAgentHotelMarkup.findOne({
                    roomTypeId: matchedRoomType?.roomTypeId,
                    resellerId: req.reseller?._id,
                });
                if (!subAgentMarkup) {
                    subAgentMarkup = await B2BSubAgentStarCategoryMarkup.findOne({
                        resellerId: req.reseller?._id,
                        name: hotel?.starCategory,
                    }).lean();
                }
            }

            const isApiConnected = rateKey?.split("|")[0] !== "TCTT";
            if (isApiConnected === false) {
                const [
                    type,
                    fromDate,
                    toDate,
                    hotelId,
                    roomTypeId,
                    basePlanCode,
                    mealSupplementCode,
                    addOnSupplements,
                    contractsObj,
                    appliedPromotions,
                ] = rateKey?.split("|");

                if (!contractsObj) {
                    return sendErrorResponse(res, 400, "invalid rate key");
                }

                const contracts = Object.keys(JSON.parse(contractsObj)).map((item) => {
                    return {
                        date: item,
                        contract: JSON.parse(contractsObj)[item],
                    };
                });

                if (
                    new Date(fromDate) >= new Date(toDate) ||
                    new Date(fromDate) < new Date(new Date().setHours(0, 0, 0, 0))
                ) {
                    return sendErrorResponse(
                        res,
                        400,
                        "invalid dates. please select a valid dates"
                    );
                }

                if (!isValidObjectId(roomTypeId)) {
                    return sendErrorResponse(res, 400, "invalid roomType id");
                }
                const roomType = await RoomType.findOne({
                    _id: roomTypeId,
                    hotel: hotelId,
                    isDeleted: false,
                    isActive: true,
                });
                if (!roomType) {
                    return sendErrorResponse(res, 404, "roomtype not found");
                }
                if (
                    req.body?.hotelId?.toString() !== hotelId ||
                    matchedRoomType?.roomTypeId?.toString() !== roomTypeId?.toString()
                ) {
                    return sendErrorResponse(
                        res,
                        400,
                        "something went wrong, please search availability again"
                    );
                }

                const date1 = new Date();
                const date2 = new Date(contracts[0]?.date);
                const diffTime = Math.abs(date2 - date1);
                const bookBefore = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                const response = await getSingleHotelBasePlanPriceORD({
                    // ...req.body,
                    hotel,
                    roomType,
                    bookBefore,
                    totalAdults,
                    totalChildren,
                    addOnSupplements: addOnSupplements ? addOnSupplements?.split(",") : [],
                    appliedPromotionIds: appliedPromotions ? JSON.parse(appliedPromotions) : [],
                    basePlanCode,
                    mealSupplementCode,
                    contracts,
                    fromDate,
                    rooms,
                    toDate,
                    nationality: searchResult?.nationality,
                });
                if (!response) {
                    return sendErrorResponse(res, 400, "something went wrong, try again");
                }

                console.log(response.payLaterAvailable);
                console.log(response.lastDateForPayment);

                createHotelLog({
                    stepNumber: 2003,
                    actionUrl: "",
                    request: "",
                    response: response,
                    processId: searchId,
                    userId: req.reseller?._id,
                });

                let wallet = await B2BWallet.findOne({
                    reseller: req.reseller?._id,
                });

                let currentNetPrice = response?.netPrice;
                let adminMarketMarkup = 0;
                if (marketMarkup && !isNaN(marketMarkup.markup)) {
                    if (marketMarkup.markupType === "flat") {
                        adminMarketMarkup = marketMarkup.markup * matchedHotel.noOfNights;
                    } else {
                        adminMarketMarkup = (currentNetPrice / 100) * marketMarkup.markup;
                    }
                }
                currentNetPrice += adminMarketMarkup;

                let adminB2bMarkup = 0;
                if (b2bMarkup && !isNaN(b2bMarkup.markup)) {
                    if (b2bMarkup.markupType === "flat") {
                        adminB2bMarkup = b2bMarkup.markup * matchedHotel.noOfNights;
                    } else {
                        adminB2bMarkup = (currentNetPrice / 100) * b2bMarkup.markup;
                    }
                }
                currentNetPrice += adminB2bMarkup;

                let saMarkup = 0;
                if (subAgentMarkup && !isNaN(subAgentMarkup.markup)) {
                    if (subAgentMarkup.markupType === "flat") {
                        saMarkup = subAgentMarkup.markup * matchedHotel.noOfNights;
                    } else {
                        saMarkup = (currentNetPrice / 100) * subAgentMarkup.markup;
                    }
                }
                currentNetPrice += saMarkup;

                // agent to clinet markup
                let clMarkup = 0;
                if (clientMarkup && !isNaN(clientMarkup.markup)) {
                    if (clientMarkup.markupType === "flat") {
                        clMarkup = clientMarkup.markup * matchedHotel.noOfNights;
                    } else {
                        clMarkup = (currentNetPrice / 100) * clientMarkup.markup;
                    }
                }
                currentNetPrice += clMarkup;

                const balanceAvailable = checkWalletBalance(wallet, currentNetPrice);
                if (!balanceAvailable) {
                    return sendErrorResponse(
                        res,
                        400,
                        "Insufficient balance. please reacharge and try again"
                    );
                }

                let totalMarkup = adminMarketMarkup + adminB2bMarkup + saMarkup + clMarkup;
                const orderRefNumber = generateUniqueString("B2BHOT");

                const b2bHotelOrder = new B2bHotelOrder({
                    ...req.body,
                    rooms,
                    roomsCount: rooms?.length,
                    mealSupplementPrice: response?.mealSupplementPrice,
                    extraBedSupplementPrice: response?.extraBedSupplementPrice,
                    childSupplementPrice: response?.childSupplementPrice,
                    totalOffer: response?.totalOffer,
                    grossPrice: response?.grossPrice + totalMarkup,
                    netPrice: currentNetPrice,
                    adminMarketMarkup,
                    adminB2bMarkup,
                    clientMarkup: clMarkup,
                    subAgentMarkup: saMarkup,
                    totalMarkup,
                    contracts: response?.contractsWithPrice,
                    status: "created",
                    extraMealSupplement: response?.extraMealSupplement
                        ? response?.extraMealSupplement
                        : null,
                    basePlan: response?.basePlan,
                    roomType: roomTypeId,
                    hotel: hotelId,
                    referenceNumber: orderRefNumber,
                    reseller: req.reseller?._id,
                    orderedBy: req.reseller.role,
                    otp: sendOtpEmail({
                        agentName: req.reseller?.name,
                        email: req.reseller?.email,
                        product: "Hotel",
                        referenceNumber: orderRefNumber,
                    }),
                    discountOffer: response?.discountOffer,
                    stayPayOffer: response?.stayPayOffer,
                    appliedStayPays: response?.appliedStayPays,
                    appliedPromotions: response?.appliedPromotions,
                    appliedMealUpgrades: response?.appliedMealUpgrades,
                    appliedRoomTypeUpgrades: response?.appliedRoomTypeUpgrades,
                    appliedDiscounts: response?.appliedDiscounts,
                    mandatoryAddOnPrice: response?.mandatoryAddOnPrice,
                    mandatoryAddOns: response?.mandatoryAddOns,
                    addOnSupplementPrice: response?.addOnSupplementPrice,
                    addOnSupplements: response?.addOnSupplements,
                    totalAddOnPrice: response?.totalAddOnPrice,
                    roomPrice: response?.roomPrice,
                    totalChildren,
                    totalAdults,
                    noOfNights: response?.contractsWithPrice?.length,
                    lastStatusChange: new Date(),
                    fromDate,
                    toDate,
                    isApiConnected: false,
                    boardType: response?.boardTypeId,
                    supplier: "tctt",
                    rateKey,
                    rateComments: response?.rateComments,
                    selectedRoomOccupancies: response?.selectedRoomOccupancies,
                    nationality: matchedRate?.nationality || null,
                    isTourismFeeIncluded: response?.isTourismFeeIncluded,
                    cancellationPolicies: response?.cancellationPolicies,
                    cancellationType: response?.cancellationType,
                    expiresIn: new Date(new Date().setMinutes(new Date().getMinutes() + 10)),
                    searchId,
                    paymentState: "non-paid",
                    lastDateForPayment: response?.lastDateForPayment || null,
                });
                await b2bHotelOrder.save();

                // if (paymentMethod === "ccavenue") {
                //     // TODO:
                //     // create a better solution to handle allocations
                //     // in this approch there is a chance to book single allocation twice or more.
                //     for (let i = 0; i < b2bHotelOrder?.contracts?.length; i++) {
                //         const allocation = await HotelAllocation.findOne({
                //             date: b2bHotelOrder?.contracts[i]?.date,
                //             hotel: b2bHotelOrder?.hotel,
                //             roomType: b2bHotelOrder?.roomType,
                //             contractGroup: b2bHotelOrder?.contracts[i]?.contractGroup,
                //         });

                //         if (!allocation || allocation?.allocationType === "stop-sale") {
                //             throw new Error("sorry, there is stop sale on selected date");
                //         }

                //         if (
                //             (allocation?.allocationType === "static" &&
                //                 allocation?.bookedAllocations >= allocation?.allocation) ||
                //             (allocation?.allocationType === "free-sale" &&
                //                 allocation?.bookedAllocations >= 99)
                //         ) {
                //             throw new Error("sorry, there is no allocation on selected date");
                //         }

                //         const date1 = new Date();
                //         const date2 = new Date(b2bHotelOrder?.contracts[i]?.date);
                //         const diffTime = Math.abs(date2 - date1);
                //         const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                //         if (diffDays < allocation?.releaseDate) {
                //             throw new Error("sorry, there is no allocation on selected date");
                //         }
                //     }

                //     const hotelOrderPayment = await B2BHotelOrderPayment.create({
                //         amount: matchedRate?.netPrice,
                //         orderId: b2bHotelOrder?._id,
                //         paymentState: "pending",
                //         resellerId: req.reseller?._id,
                //         paymentMethod: "ccavenue",
                //         paymentStateMessage: "",
                //     });
                //     return ccavenueFormHandler({
                //         res,
                //         totalAmount: matchedRate?.netPrice,
                //         redirectUrl: `${process.env.SERVER_URL}/api/v1/b2b/hotels/orders/ccavenue/capture`,
                //         cancelUrl: `${process.env.SERVER_URL}/api/v1/b2b/hotels/orders/ccavenue/capture`,
                //         orderId: hotelOrderPayment?._id,
                //     });
                // }

                res.status(200).json(b2bHotelOrder);
            } else {
                if (!isValidObjectId(matchedRoomType?.roomTypeId)) {
                    return sendErrorResponse(res, 400, "invalid roomType id");
                }
                const roomType = await RoomType.findOne({
                    _id: matchedRoomType?.roomTypeId,
                    isDeleted: false,
                    // hotelBedRooms: hotelBedRate?.rooms[0]?.code,
                    hotel: hotel?._id,
                    isActive: true,
                });
                if (!roomType) {
                    return sendErrorResponse(res, 404, "room type not found");
                }

                const boardType = await HotelBoardType.findOne({
                    boardShortName: matchedRate?.boardCode,
                }).lean();
                if (!boardType) {
                    return sendErrorResponse(
                        res,
                        400,
                        "board type not found, please search availability again"
                    );
                }

                if (paymentMethod === "wallet") {
                    let wallet = await B2BWallet.findOne({
                        reseller: req.reseller?._id,
                    });
                    const balanceAvailable = checkWalletBalance(wallet, matchedRate?.netPrice);
                    if (!balanceAvailable) {
                        return sendErrorResponse(
                            res,
                            400,
                            "Insufficient balance. please reacharge and try again"
                        );
                    }
                }

                const orderRefNumber = generateUniqueString("B2BHOT");

                const b2bHotelOrder = new B2bHotelOrder({
                    ...req.body,
                    roomsCount: rooms?.length,
                    rooms,
                    mealSupplementPrice: 0,
                    extraBedSupplementPrice: 0,
                    childSupplementPrice: 0,
                    totalOffer: matchedRate?.totalOffer,
                    grossPrice: matchedRate?.grossPrice,
                    netPrice: matchedRate?.netPrice,
                    adminMarketMarkup: matchedRate?.markup?.adminMarketMarkup,
                    adminB2bMarkup: matchedRate?.markup?.adminB2bMarkup,
                    subAgentMarkup: matchedRate?.markup?.subAgentMarkup,
                    clientMarkup: matchedRate?.markup?.clientMarkup,
                    totalMarkup:
                        matchedRate?.markup?.adminMarketMarkup +
                        matchedRate?.markup?.adminB2bMarkup +
                        matchedRate?.markup?.subAgentMarkup +
                        matchedRate?.markup?.clientMarkup,
                    contracts: [],
                    status: "created",
                    extraMealSupplement: null,
                    basePlan: null,
                    hotel: hotel?._id,
                    roomType: matchedRoomType?.roomTypeId,
                    referenceNumber: orderRefNumber,
                    reseller: req.reseller?._id,
                    orderedBy: req.reseller.role,
                    otp: sendOtpEmail({
                        agentName: req.reseller?.name,
                        email: req.reseller?.email,
                        product: "Hotel",
                        referenceNumber: orderRefNumber,
                    }),
                    discountOffer: 0,
                    stayPayOffer: 0,
                    appliedStayPays: [],
                    appliedPromotions: matchedRate?.promotions || [],
                    appliedMealUpgrades: [],
                    appliedRoomTypeUpgrades: [],
                    appliedDiscounts: [],
                    mandatoryAddOnPrice: 0,
                    mandatoryAddOns: [],
                    addOnSupplementPrice: 0,
                    addOnSupplements: [],
                    totalAddOnPrice: 0,
                    roomPrice: matchedRate?.roomPrice,
                    totalChildren,
                    totalAdults,
                    noOfNights: matchedHotel?.noOfNights,
                    lastStatusChange: new Date(),
                    fromDate: searchResult?.fromDate,
                    toDate: searchResult?.toDate,
                    isApiConnected: true,
                    boardType: boardType?._id,
                    supplier: "hotel-beds",
                    rateKey,
                    rateComments: matchedRate.rateComments,
                    selectedRoomOccupancies: matchedRate?.selectedRoomOccupancies,
                    nationality: matchedRate?.nationality || null,
                    isTourismFeeIncluded: null,
                    cancellaPolicies: matchedRate?.cancellationPolicies,
                    cancellationType: "",
                    expiresIn: new Date(new Date().setMinutes(new Date().getMinutes() + 10)),
                    searchId,
                    paymentState: "non-paid",
                });
                await b2bHotelOrder.save();

                // if (paymentMethod === "ccavenue") {
                //     const hotelOrderPayment = await B2BHotelOrderPayment.create({
                //         amount: matchedRate?.netPrice,
                //         orderId: b2bHotelOrder?._id,
                //         paymentState: "pending",
                //         resellerId: req.reseller?._id,
                //         paymentMethod: "ccavenue",
                //         paymentStateMessage: "",
                //     });
                //     return ccavenueFormHandler({
                //         res,
                //         totalAmount: matchedRate?.netPrice,
                //         redirectUrl: `${process.env.SERVER_URL}/api/v1/b2b/hotels/orders/ccavenue/capture`,
                //         cancelUrl: `${process.env.SERVER_URL}/api/v1/b2b/hotels/orders/ccavenue/capture`,
                //         orderId: hotelOrderPayment?._id,
                //     });
                // }

                res.status(200).json(b2bHotelOrder);
            }
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    completeB2BHotelOrder: async (req, res) => {
        try {
            const { orderId } = req.params;
            const { otp } = req.body;

            createHotelLog({
                stepNumber: 3001,
                actionUrl: "",
                request: req.body,
                response: "",
                processId: orderId,
                userId: req.reseller?._id,
            });

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }
            const b2bHotelOrder = await B2bHotelOrder.findOne({
                _id: orderId,
                reseller: req.reseller?._id,
            });
            if (!b2bHotelOrder) {
                return sendErrorResponse(res, 400, "sorry order not found");
            }

            if (b2bHotelOrder.status !== "created") {
                return sendErrorResponse(
                    res,
                    400,
                    "sorry, you have already completed or cancelled this order!"
                );
            }

            if (new Date(b2bHotelOrder.expiresIn).getTime() < new Date().getTime()) {
                return sendErrorResponse(
                    res,
                    400,
                    "your order is expired, please create a new order"
                );
            }

            if (!b2bHotelOrder.otp || b2bHotelOrder.otp !== Number(otp)) {
                return sendErrorResponse(res, 400, "incorrect otp!");
            }

            let wallet = await B2BWallet.findOne({ reseller: req.reseller?._id });
            const balanceAvailable = checkWalletBalance(wallet, b2bHotelOrder?.netPrice);
            if (!balanceAvailable) {
                return sendErrorResponse(
                    res,
                    400,
                    "Insufficient balance. please reacharge and try again"
                );
            }

            const hotelOrderPayment = await B2BHotelOrderPayment.create({
                amount: b2bHotelOrder?.netPrice,
                orderId,
                paymentState: "pending",
                resellerId: req.reseller?._id,
                paymentMethod: "wallet",
                paymentStateMessage: "",
            });

            // deducting amount from wallet
            try {
                await deductAmountFromWallet(wallet, b2bHotelOrder.netPrice);
            } catch (err) {
                hotelOrderPayment.paymentState = "failed";
                await hotelOrderPayment.save();
                return sendErrorResponse(res, 400, "wallet deduction failed, please try again");
            }

            hotelOrderPayment.paymentState = "success";
            await hotelOrderPayment.save();

            await B2BTransaction.create({
                reseller: req.reseller?._id,
                paymentProcessor: "wallet",
                product: "hotel",
                processId: b2bHotelOrder?._id,
                description: `Hotel order payment`,
                debitAmount: b2bHotelOrder.netPrice,
                creditAmount: 0,
                directAmount: 0,
                closingBalance: wallet.balance,
                dueAmount: wallet.creditUsed,
                remark: "Hotel order payment",
                dateTime: new Date(),
            });

            const refundPaidAmount = async () => {
                let hotelOrderRefund;
                try {
                    const hotelOrderRefund = await B2BHotelOrderRefund.create({
                        amount: b2bHotelOrder.netPrice,
                        resellerId: req.reseller?._id,
                        paymentMethod: "wallet",
                        orderId,
                        note: "",
                        status: "pending",
                    });
                    await addMoneyToB2bWallet(wallet, b2bHotelOrder.netPrice);
                    hotelOrderRefund.status = "success";
                    await hotelOrderRefund.save();

                    await B2BTransaction.create({
                        reseller: req.reseller?._id,
                        paymentProcessor: "wallet",
                        product: "hotel",
                        processId: b2bHotelOrder?._id,
                        description: `Hotel order refund`,
                        debitAmount: 0,
                        creditAmount: b2bHotelOrder.netPrice,
                        directAmount: 0,
                        closingBalance: wallet.balance,
                        dueAmount: wallet.creditUsed,
                        remark: "Hotel order refund",
                        dateTime: new Date(),
                    });
                } catch (err) {
                    if (hotelOrderRefund) {
                        hotelOrderRefund.status = "failed";
                        await hotelOrderRefund.save();
                    }
                    return sendErrorResponse(
                        res,
                        400,
                        "something went wrong on hotel order refund"
                    );
                }
            };

            let orderStaus = "booked";
            let apiReference;
            let supplierName;
            let vatNumber;
            let rateComments = [];
            if (b2bHotelOrder.isApiConnected === false) {
                let allocationIds = [];
                for (let i = 0; i < b2bHotelOrder?.contracts?.length; i++) {
                    const allocation = await HotelAllocation.findOne({
                        date: b2bHotelOrder?.contracts[i]?.date,
                        hotel: b2bHotelOrder?.hotel,
                        roomType: b2bHotelOrder?.roomType,
                        contractGroup: b2bHotelOrder?.contracts[i]?.contractGroup,
                    });

                    if (!allocation || allocation?.allocationType === "stop-sale") {
                        await refundPaidAmount();
                        throw new Error("sorry, there is stop sale on selected date");
                    }

                    if (
                        (allocation?.allocationType === "static" &&
                            allocation?.bookedAllocations >= allocation?.allocation) ||
                        (allocation?.allocationType === "free-sale" &&
                            allocation?.bookedAllocations >= 99)
                    ) {
                        await refundPaidAmount();
                        throw new Error("sorry, there is no allocation on selected date");
                    }

                    const date1 = new Date();
                    const date2 = new Date(b2bHotelOrder?.contracts[i]?.date);
                    const diffTime = Math.abs(date2 - date1);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays < allocation?.releaseDate) {
                        await refundPaidAmount();
                        throw new Error("sorry, there is no allocation on selected date");
                    }

                    if (allocation?.allocationType !== "stop-sale") {
                        allocationIds.push(allocation?._id);
                    }
                }
                await HotelAllocation.updateMany(
                    { _id: allocationIds },
                    { $inc: { bookedAllocations: 1 } }
                );
                supplierName = "Traveller's Choice Travel & Tourism LLC";
                vatNumber = "100359576400003";
            } else {
                // await getSingleHotelBedRate({ rateKey: b2bHotelOrder.rateKey });
                let hotelBedOrder;

                console.log(b2bHotelOrder);
                // checking oly
                let datasss = {
                    rateKey: b2bHotelOrder.rateKey,
                    specialRequest: b2bHotelOrder?.specialRequest,
                    travellerDetails: b2bHotelOrder?.travellerDetails,
                    rooms: b2bHotelOrder?.rooms,
                    orderId,
                    resellerId: req.reseller?._id,
                };

                try {
                    hotelBedOrder = await createHotelBedBooking({
                        rateKey: b2bHotelOrder.rateKey,
                        specialRequest: b2bHotelOrder?.specialRequest,
                        travellerDetails: b2bHotelOrder?.travellerDetails,
                        rooms: b2bHotelOrder?.rooms,
                        orderId,
                        resellerId: req.reseller?._id,
                    });
                } catch (err) {
                    console.log(err);
                    await refundPaidAmount();
                    throw err;
                }

                if (!hotelBedOrder) {
                    await refundPaidAmount();

                    return sendErrorResponse(
                        res,
                        400,
                        "something went wrong, please try again later"
                    );
                }

                apiReference = hotelBedOrder.reference;
                orderStaus = hotelBedOrder.status === "CONFIRMED" ? "confirmed" : "booked";
                supplierName = hotelBedOrder?.hotel?.supplier?.name;
                vatNumber = hotelBedOrder?.hotel?.supplier?.vatNumber;
                rateComments = hotelBedOrder?.hotel?.rooms[0]?.rates?.map((item) => {
                    return item?.rateComments;
                });
            }

            b2bHotelOrder.status = orderStaus;
            b2bHotelOrder.paymentState = "fully-paid";
            b2bHotelOrder.lastStatusChange = new Date();
            b2bHotelOrder.hotelBookingId = apiReference;
            b2bHotelOrder.supplierName = supplierName;
            b2bHotelOrder.vatNumber = vatNumber;
            if (b2bHotelOrder?.isApiConnected === true) {
                b2bHotelOrder.rateComments = rateComments;
            }
            await b2bHotelOrder.save();

            if (b2bHotelOrder.isApiConnected === false) {
                sendHotelReservationEmail({ orderId: b2bHotelOrder?._id });
            }
            if (b2bHotelOrder.status === "confirmed") {
                // sendHotelConfirmationEmail({ orderId: b2bHotelOrder?._id });
                hotelOrderConfirmationEmail({ orderId: b2bHotelOrder?._id });
            }

            const responseData = {
                _id: b2bHotelOrder?._id,
                referenceNumber: b2bHotelOrder.referenceNumber,
                message: "hotel successfully booked",
            };

            createHotelLog({
                stepNumber: 3004,
                actionUrl: "",
                request: "",
                response: responseData,
                processId: b2bHotelOrder?._id,
                userId: req.reseller?._id,
            });

            res.status(200).json(responseData);
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleAllOrdersB2b: async (req, res) => {
        try {
            const { skip = 0, limit = 10 } = req.query;

            const hotelOrders = await B2bHotelOrder.find({
                reseller: req.reseller?._id,
            })
                .populate("hotel", "hotelName address images")
                .populate("reseller", "agentCode companyName")
                .populate("roomType", "roomName")
                .populate("basePlan", "boardName")
                .populate("extraMealSupplement", "boardName")
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalHotelOrders = await B2bHotelOrder.count();

            res.status(200).json({
                hotelOrders,
                skip: Number(skip),
                limit: Number(limit),
                totalHotelOrders,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleHotelOrderApi: async (req, res) => {
        try {
            const { orderId } = req.params;

            if (!isValidObjectId(orderId)) return sendErrorResponse(res, 400, "invalid order id");

            const hotelOrder = await B2bHotelOrder.findOne({
                _id: orderId,
                reseller: req.reseller?._id,
            })
                .populate("hotel", "hotelName address images")
                .populate("reseller", "agentCode companyName email")
                .populate("contactDetails.country", "countryName phonecode")
                .populate("roomType", "roomName")
                .populate("boardType", "boardName boardShortName")
                .populate("basePlan", "boardName boardShortName")
                .lean();

            if (!hotelOrder) return sendErrorResponse(res, 400, "hotel order not found");

            res.status(200).json(hotelOrder);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    cancelB2bHotelOrderApi: async (req, res) => {
        try {
            const { orderId } = req.params;
            const { cancellationRemark } = req.body;

            if (!isValidObjectId(orderId)) return sendErrorResponse(res, 400, "invalid order id");

            const orderDetails = await B2bHotelOrder.findOne({
                _id: orderId,
                reseller: req.reseller?._id,
            })
                .populate("reseller", "_id role name email refferedBy")
                .lean();

            if (!orderDetails) return sendErrorResponse(res, 400, "order details not found");

            if (orderDetails.status !== "booked" && orderDetails.status !== "confirmed")
                return sendErrorResponse(res, 400, "sorry, this order can't cancel right now.");

            if (new Date(orderDetails.fromDate) <= new Date(new Date().setHours(0, 0, 0, 0))) {
                return sendErrorResponse(res, 400, "sorry, order cancellation time ended");
            }

            let orderCancellation = await B2BHotelOrderCancellation.findOne({
                orderId,
                resellerId: req.reseller?._id,
                $or: [{ cancellationStatus: "pending" }, { cancellationStatus: "success" }],
            });

            if (orderCancellation) {
                if (
                    orderCancellation.cancellationStatus === "pending" &&
                    orderDetails.isCancellationPending === true
                ) {
                    return sendErrorResponse(
                        res,
                        400,
                        "sorry, this order already submitted cancellation request."
                    );
                } else if (orderCancellation.cancellationStatus === "success") {
                    return sendErrorResponse(res, 400, "sorry, this order is already cancelled");
                }
            } else {
                orderCancellation = await B2BHotelOrderCancellation.create({
                    cancellationProvider:
                        orderDetails.isApiConnected === true ? "hotel-beds" : "tctt",
                    cancellationRemark,
                    cancellationStatus: "pending",
                    orderId,
                    resellerId: req.reseller?._id,
                    cancelledBy: "b2b",
                });
            }
            if (orderDetails.isApiConnected === true) {
                const response = await cancelHotelBedBooking({
                    bookingReference: orderDetails.hotelBookingId,
                });

                orderCancellation.cancellationStatus = "success";
                orderCancellation.cancellationChargeHotelBed = response?.hotel?.cancellationAmount;
                orderCancellation.cancellationCharge = response?.hotel?.cancellationAmount;

                orderDetails.status === "cancelled";

                const refundAmount = orderDetails.netPrice - response?.hotel?.cancellationAmount;
                if (refundAmount > 0) {
                    const hotelOrderRefund = await B2BHotelOrderRefund.create({
                        amount: refundAmount,
                        note: "Hotel order cancelled by b2b",
                        orderId,
                        paymentMethod: "wallet",
                        resellerId: req.reseller?._id,
                        status: "pending",
                    });

                    let wallet = await B2BWallet.findOne({
                        reseller: req.reseller?._id,
                    });

                    if (!wallet) {
                        wallet = new B2BWallet({
                            balance: refundAmount,
                            reseller: req.reseller?._id,
                        });

                        await wallet.save();
                    } else {
                        wallet.balance += refundAmount;
                        await wallet.save();
                    }

                    hotelOrderRefund.status = "completed";
                    await hotelOrderRefund.save();
                    await B2BTransaction.create({
                        reseller: req.reseller?._id,
                        paymentProcessor: "wallet",
                        product: "hotel",
                        processId: orderId,
                        description: `Hotel order refund`,
                        debitAmount: 0,
                        creditAmount: refundAmount,
                        directAmount: 0,
                        closingBalance: wallet.balance,
                        dueAmount: wallet.creditUsed,
                        remark: "Hotel order refund",
                        dateTime: new Date(),
                    });
                }

                cancellationConfirmationEmailToReseller({
                    email: orderDetails?.reseller?.email,
                    name: orderDetails?.reseller?.name,
                    referenceNumber: orderDetails.referenceNumber,
                });
            } else {
                orderDetails.isCancellationPending = true;
                hotelOrderCancellationRequestEmailForReseller({
                    email: orderDetails?.reseller?.email,
                    name: orderDetails?.reseller?.name,
                    referenceNumber: orderDetails?.referenceNumber,
                });

                hotelOrderCancellationRequestEmailForDpt({
                    name: orderDetails?.reseller?.name,
                    referenceNumber: orderDetails?.referenceNumber,
                    mainAgentId:
                        orderDetails?.reseller?.role === "reseller"
                            ? orderDetails?.reseller?._id
                            : orderDetails?.reseller?.referredBy,
                });
            }

            await orderCancellation.save();
            await orderDetails.save();

            res.status(200).json({
                message: "order cancellation request successfully submitted.",
                status: orderDetails.status,
                cancelledBy: orderDetails.cancelledBy,
                cancellationRemark: orderDetails.cancellationRemark,
                isCancellationPending: orderDetails?.isCancellationPending,
            });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    downloadHotelOrderVoucher: async (req, res) => {
        try {
            const { orderId } = req.params;
            if (!isValidObjectId(orderId)) return sendErrorResponse(res, 400, "invalid order id");

            const hotelOrder = await B2bHotelOrder.findOne({
                _id: orderId,
                reseller: req.reseller?._id,
            })
                .populate({
                    path: "hotel",
                    populate: {
                        path: "country state city accommodationType hotelContact",
                    },
                })
                .populate("roomType")
                .populate("boardType")
                .populate("contactDetails.country")
                .lean();

            if (!hotelOrder) return sendErrorResponse(res, 400, "hotel order not found");

            if (hotelOrder.status !== "confirmed")
                return sendErrorResponse(res, 400, "sorry, hotel order not confirmed");

            const pdfBuffer = await createHotelVoucher({ hotelOrder });

            res.set({
                "Content-Type": "application/pdf",
                "Content-Dispositon": "attachment; filename=voucher.pdf",
            });

            res.send(pdfBuffer);
        } catch (err) {
            sendErrorResponse(res, 400, err);
        }
    },
};
