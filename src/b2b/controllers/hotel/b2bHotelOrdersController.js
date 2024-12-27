const { isValidObjectId } = require("mongoose");
const nodeCCAvenue = require("node-ccavenue");
const moment = require("moment");

const { sendErrorResponse } = require("../../../helpers");
const { Country } = require("../../../models");
const {
    Hotel,
    RoomType,
    HotelBedRoomType,
    HotelAllocation,
    HotelBoardType,
    HotelAvailSearchResult,
} = require("../../../models/hotel");
const { getSingleHotelBasePlanPriceORD } = require("../../helpers/hotel/hotelOrderHelpers");
const {
    B2BWallet,
    B2BTransaction,
    B2BMarkupProfile,
    B2bSubAgentHotelMarkup,
    Reseller,
} = require("../../models");
const {
    B2bHotelOrder,
    B2BClientStarCategoryMarkup,
    B2BSubAgentStarCategoryMarkup,
    B2BHotelOrderRefund,
    B2BHotelOrderCancellation,
    B2BHotelOrderPayment,
    B2BHotelPayLaterCronJob,
} = require("../../models/hotel");
const {
    hotelOrderSchema,
    hotelOrderPayLaterSchema,
    hotelOrderInitiatePaymentSchema,
} = require("../../validations/hotel/hotelOrder.schema");
const { generateUniqueString, ccavenueFormHandler } = require("../../../utils");
const {
    createHotelBedBooking,
    cancelHotelBedBooking,
} = require("../../helpers/hotel/hotelBedAvailabilityHelpers");
const { createHotelVoucher } = require("../../helpers/hotel/hotelVoucherHelpers");
const B2BClientHotelMarkup = require("../../models/hotel/b2bClientHotelMarkup.model");
const { sendHotelConfirmationEmail } = require("../../../helpers/hotel");
const { createB2bHotelOrderInvoice } = require("../../helpers/hotel");
const {
    hotelOrderConfirmationEmail,
    cancellationConfirmationEmailToReseller,
    hotelOrderCancellationRequestEmailForDpt,
    hotelOrderCancellationRequestEmailForReseller,
    sendHotelReservationEmail,
    sendHotelOrderPaymentCompletionEmail,
} = require("../../helpers/hotel/email");
const {
    checkWalletBalance,
    deductAmountFromWallet,
    addMoneyToB2bWallet,
} = require("../../utils/wallet");
const { createHotelLog } = require("../../helpers/hotel/hotelLogsHelpers");
const MarketStrategy = require("../../../admin/models/marketStrategy.model");
const { sendOtpEmail } = require("../../helpers/global");
const OttilaRoomType = require("../../../models/hotel/ottilaRoomType.model");
const { HOTEL_PROVIDERS } = require("../../utils/constants");
const B2BHotelProvider = require("../../models/hotel/b2bHotelProviders.model");
const {
    createOttilaPreBooking,
    createOttilaBooking,
    cancelOttilaHotelBooking,
    BOOKING_CANCEL_STATUS,
} = require("../../helpers/hotel/ottilaAvailabilityHelpers");
const OttilaRoomRateInfo = require("../../../models/hotel/ottilaRoomRateInfo.model");
const IolxRoomRateInfo = require("../../../models/hotel/iolxRoomRateInfo.model");
const {
    createIOLXBooking,
    cancelIOLXHotelBooking,
} = require("../../helpers/hotel/iolxAvailabilityHelper");

const ccav = new nodeCCAvenue.Configure({
    merchant_id: process.env.CCAVENUE_MERCHANT_ID,
    working_key: process.env.CCAVENUE_WORKING_KEY,
});

module.exports = {
    createB2bHotelOrder: async (req, res) => {
        try {
            const { searchId, hotelId, contactDetails, paymentMethod, travellerDetails } = req.body;

            let { rateKey } = req.body;

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
            if (!searchResult) {
                return sendErrorResponse(
                    res,
                    404,
                    "search results not found. please search availability again"
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

            if (new Date(searchResult.expiresIn).getTime() < new Date().getTime()) {
                return res.status(400).json({
                    errorCode: "EXPIRIED",
                    message: "sorry search result expired, please search availability again",
                    hotelId,
                    fromDate: searchResult.fromDate,
                    toDate: searchResult.toDate,
                    rooms: searchResult.rooms,
                    nationality: searchResult.nationality || "",
                });
            }

            if (!isValidObjectId(hotelId)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }
            const hotel = await Hotel.findOne({
                _id: hotelId,
                isDeleted: false,
                isActive: true,
                isPublished: true,
            }).lean();
            if (!hotel) {
                return sendErrorResponse(res, 404, "hotel not found");
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
                                rate.rateKey = rate?.rateKeyRaw;
                                rateKey = rate?.rateKeyRaw;
                                matchedRate = rate;
                                matchedRoomType = hotel?.rooms[j];
                                break;
                            }
                        }
                    }
                    break;
                }
            }

            if (!matchedRate || !matchedHotel || !matchedRoomType) {
                return sendErrorResponse(
                    res,
                    400,
                    "sorry rateKey not found, please search availability again"
                );
            }

            const hotelProviderId = matchedRate?.detailsKey?.split("|")[0];

            const providerDetails = await B2BHotelProvider.findOne({ _id: hotelProviderId });

            if (!providerDetails) return sendErrorResponse(res, 404, "Provider details not found");

            if (
                hotel.allGuestDetailsRequired !== true &&
                providerDetails.name !== HOTEL_PROVIDERS.OTTILA &&
                travellerDetails?.length !== searchResult?.rooms?.length
            ) {
                return sendErrorResponse(res, 400, "one guest details from each room is mandatory");
            }

            const rooms = searchResult?.rooms;

            if (!isValidObjectId(contactDetails?.country)) {
                return sendErrorResponse(res, 400, "invalid country id");
            }
            const country = await Country.findOne({
                _id: contactDetails?.country,
                isDeleted: false,
            });
            if (!country) {
                return sendErrorResponse(res, 404, "country not found");
            }

            const totalAdults = rooms?.reduce((a, b) => a + b?.noOfAdults, 0);
            const totalChildren = rooms?.reduce((a, b) => a + b?.noOfChildren, 0);

            let roomTypeModel;
            let supplier;

            switch (providerDetails.name) {
                // Contract providerId
                case HOTEL_PROVIDERS.CONTRACT:
                    roomTypeModel = RoomType;
                    supplier = "tctt";
                    break;

                // HotelBeds providerId
                case HOTEL_PROVIDERS.HOTELBEDS:
                    roomTypeModel = HotelBedRoomType;
                    supplier = "hotel-beds";
                    break;

                // Ottila providerId
                case HOTEL_PROVIDERS.OTTILA:
                    roomTypeModel = OttilaRoomType;
                    supplier = "ottila";
                    break;

                case HOTEL_PROVIDERS.IOLX:
                    // roomTypeModel = OttilaRoomType;
                    supplier = "iolx";
                    break;

                default:
                    roomTypeModel = RoomType;
                    break;
            }

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
                    if (marketStrategy?.hotel[mi]?.hotelId?.toString() === hotel?._id?.toString()) {
                        for (let mj = 0; mj < marketStrategy?.hotel[mi]?.roomTypes?.length; mj++) {
                            let tempRmType = marketStrategy?.hotel[mi]?.roomTypes[mj];
                            if (
                                tempRmType?.roomTypeId?.toString() ===
                                    matchedRoomType?.roomTypeId?.toString() &&
                                tempRmType?.hotelProviderId?.toString() === hotelProviderId &&
                                tempRmType?.markup !== 0
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
                            for (
                                let mj = 0;
                                mj < marketStrategy?.starCategory[mi]?.markups?.length;
                                mj++
                            ) {
                                let tempMarkup = marketStrategy?.starCategory[mi]?.markups[mj];
                                if (tempMarkup?.hotelProviderId?.toString() === hotelProviderId) {
                                    marketMarkup = tempMarkup;
                                    break;
                                }
                            }
                        }
                    }
                }
            }

            let profileMarkup;
            let b2bMarkup;
            if (req.reseller.role === "reseller") {
                profileMarkup = await B2BMarkupProfile.findOne({
                    resellerId: req.reseller?._id,
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
                                    matchedRoomType?.roomTypeId?.toString() &&
                                tempRmType?.hotelProviderId?.toString() === hotelProviderId &&
                                tempRmType?.markup !== 0
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
                            for (
                                let mj = 0;
                                mj < profileMarkup?.starCategory[mi]?.markups?.length;
                                mj++
                            ) {
                                let tempMarkup = profileMarkup?.starCategory[mi]?.markups[mj];
                                if (tempMarkup?.hotelProviderId?.toString() === hotelProviderId) {
                                    b2bMarkup = tempMarkup;
                                    break;
                                }
                            }
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
                    promotionId,
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
                const roomType = await roomTypeModel.findOne({
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
                    promotionId,
                });
                if (!response) {
                    return sendErrorResponse(res, 400, "something went wrong, try again");
                }

                // console.log(response.payLaterAvailable);
                // console.log(response.lastDateForPayment);

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

                if (paymentMethod === "wallet") {
                    const balanceAvailable = checkWalletBalance(wallet, currentNetPrice);
                    if (!balanceAvailable) {
                        return sendErrorResponse(
                            res,
                            400,
                            "Insufficient balance. please reacharge and try again"
                        );
                    }
                }

                let totalMarkup = adminMarketMarkup + adminB2bMarkup + saMarkup + clMarkup;
                const orderRefNumber = generateUniqueString("B2BHOT");

                let totalFee = 0;
                if (paymentMethod === "ccavenue") {
                    totalFee += (currentNetPrice / 100) * 3 + 1;
                }

                console.log("nationality", searchResult?.nationality);
                console.log("totalFee", totalFee);
                // console.log(hello);

                const b2bHotelOrder = new B2bHotelOrder({
                    ...req.body,
                    rooms,
                    roomsCount: rooms?.length,
                    mealSupplementPrice: response?.mealSupplementPrice,
                    extraBedSupplementPrice: response?.extraBedSupplementPrice,
                    childSupplementPrice: response?.childSupplementPrice,
                    totalOffer: response?.totalOffer,
                    grossPrice: response?.grossPrice + totalMarkup + totalFee,
                    netPrice: currentNetPrice + totalFee,
                    adminMarketMarkup,
                    adminB2bMarkup,
                    clientMarkup: clMarkup,
                    subAgentMarkup: saMarkup,
                    totalMarkup,
                    totalFee,
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
                    detailsKey: matchedRate?.detailsKey,
                    rateComments: response?.rateComments,
                    selectedRoomOccupancies: response?.selectedRoomOccupancies,
                    nationality: searchResult?.nationality || null,
                    isTourismFeeIncluded: response?.isTourismFeeIncluded,
                    cancellationPolicies: response?.cancellationPolicies,
                    cancellationType: response?.cancellationType,
                    expiresIn: new Date(new Date().setMinutes(new Date().getMinutes() + 10)),
                    searchId,
                    paymentState: "non-paid",
                    lastDateForPayment: response?.lastDateForPayment || null,
                });
                await b2bHotelOrder.save();

                if (paymentMethod === "ccavenue") {
                    // TODO:
                    // create a better solution to handle allocations
                    // in this approch there is a chance to book single allocation twice or more.
                    for (let i = 0; i < b2bHotelOrder?.contracts?.length; i++) {
                        const allocation = await HotelAllocation.findOne({
                            date: b2bHotelOrder?.contracts[i]?.date,
                            hotel: b2bHotelOrder?.hotel,
                            roomType: b2bHotelOrder?.roomType,
                            contractGroup: b2bHotelOrder?.contracts[i]?.contractGroup,
                        });

                        if (!allocation || allocation?.allocationType === "stop-sale") {
                            throw new Error("sorry, there is stop sale on selected date");
                        }

                        if (
                            (allocation?.allocationType === "static" &&
                                allocation?.bookedAllocations >= allocation?.allocation) ||
                            (allocation?.allocationType === "free-sale" &&
                                allocation?.bookedAllocations >= 99)
                        ) {
                            throw new Error("sorry, there is no allocation on selected date");
                        }

                        const date1 = new Date();
                        const date2 = new Date(b2bHotelOrder?.contracts[i]?.date);
                        const diffTime = Math.abs(date2 - date1);
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                        if (diffDays < allocation?.releaseDate) {
                            throw new Error("sorry, there is no allocation on selected date");
                        }
                    }

                    const hotelOrderPayment = await B2BHotelOrderPayment.create({
                        amount: currentNetPrice + totalFee,
                        orderId: b2bHotelOrder?._id,
                        paymentState: "pending",
                        resellerId: req.reseller?._id,
                        paymentMethod: "ccavenue",
                        paymentStateMessage: "",
                    });
                    return ccavenueFormHandler({
                        res,
                        totalAmount: currentNetPrice + totalFee,
                        redirectUrl: `${process.env.SERVER_URL}/api/v1/b2b/hotels/orders/ccavenue/capture`,
                        cancelUrl: `${process.env.SERVER_URL}/api/v1/b2b/hotels/orders/ccavenue/capture`,
                        orderId: hotelOrderPayment?._id,
                    });
                }

                res.status(200).json({
                    message: "Hotel order successfully created",
                    _id: b2bHotelOrder?._id,
                    orderId: b2bHotelOrder?._id,
                    payableAmount: b2bHotelOrder?.netPrice,
                });
            } else {
                let roomType = matchedRoomType?.roomType;
                let boardType;

                if (providerDetails.configurations.hasRoomTypeAvailable) {
                    if (!isValidObjectId(matchedRoomType?.roomTypeId)) {
                        return sendErrorResponse(res, 400, "invalid roomType id");
                    }
                    roomType = await roomTypeModel.findOne({
                        _id: matchedRoomType?.roomTypeId,
                        isDeleted: false,
                        // hotelBedRooms: hotelBedRate?.rooms[0]?.code,
                        hotel: hotel?._id,
                        isActive: true,
                    });
                    if (!roomType) {
                        return sendErrorResponse(res, 404, "room type not found");
                    }
                }

                if (matchedRate?.boardCode) {
                    boardType = await HotelBoardType.findOne({
                        boardShortName: matchedRate?.boardCode,
                    }).lean();
                } else if (matchedRate?.boardName) {
                    boardType = await HotelBoardType.findOne({
                        boardName: matchedRate?.boardName,
                    }).lean();
                }

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

                const orderRefNumber = generateUniqueString(supplier !== "iolx" ? "B2BHOT" : null);

                let totalFee = 0;
                if (paymentMethod === "ccavenue") {
                    totalFee += (matchedRate?.netPrice / 100) * 3 + 1;
                }

                let updatedRateInfo;
                // if (supplier === "ottila") {
                //     const rateInfo = matchedRate?.rateInfo;

                //     if (!rateInfo) {
                //         return sendErrorResponse(res, 400, "Invalid rate info!");
                //     }
                //     updatedRateInfo = { ...matchedRate?.rateInfo };

                //     try {
                //         const preBookInfo = await createOttilaPreBooking(
                //             rateInfo,
                //             matchedRate?.rateKey,
                //             "",
                //             req.reseller?._id
                //         );
                //         if (Math.floor(preBookInfo.Amount) !== Math.floor(matchedRate?.roomPrice)) {
                //             return sendErrorResponse(res, 400, "Rate amount has been changed!");
                //         }
                //         if (!preBookInfo.Available) {
                //             return sendErrorResponse(res, 404, "Room is not available!");
                //         }
                //         updatedRateInfo.policies = preBookInfo?.Policies;
                //         updatedRateInfo.amount = preBookInfo?.Amount;
                //         updatedRateInfo.actions = updatedRateInfo.actions.map((action) => {
                //             if (action.type === "v2-res") {
                //                 return {
                //                     ...action,
                //                     rateKey: matchedRate?.rateKey,
                //                 };
                //             }
                //             return action;
                //         });
                //         updatedRateInfo?.actions?.push({
                //             type: "pre-booking",
                //             tokenId: preBookInfo?.TokenId,
                //             hKey: preBookInfo?.HKey,
                //         });
                //         const updatedRooms = updatedRateInfo.roomDetail.map((rm) => ({
                //             ...rm,
                //             RateKey:
                //                 preBookInfo?.RoomDetails.find(
                //                     (rm2) => rm.RoomSrNo.toString() === rm2.RoomSrNo
                //                 )?.RateKey || "",
                //         }));
                //         updatedRateInfo.roomDetail = updatedRooms;
                //     } catch (error) {
                //         console.error(error);
                //         return sendErrorResponse(res, 400, error);
                //     }
                // }

                const b2bHotelOrder = new B2bHotelOrder({
                    ...req.body,
                    roomsCount: rooms?.length,
                    rooms,
                    mealSupplementPrice: 0,
                    extraBedSupplementPrice: 0,
                    childSupplementPrice: 0,
                    totalOffer: matchedRate?.totalOffer,
                    grossPrice: matchedRate?.grossPrice + totalFee,
                    totalFee,
                    netPrice: matchedRate?.netPrice + totalFee,
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
                    supplier,
                    rateKey,
                    detailsKey: matchedRate?.detailsKey,
                    rateComments: matchedRate.rateComments,
                    selectedRoomOccupancies: matchedRate?.selectedRoomOccupancies,
                    nationality: searchResult?.nationality || null,
                    isTourismFeeIncluded: null,
                    cancellaPolicies: matchedRate?.cancellationPolicies,
                    cancellationType: "",
                    expiresIn: new Date(new Date().setMinutes(new Date().getMinutes() + 10)),
                    searchId,
                    paymentState: "non-paid",
                });
                await b2bHotelOrder.save();

                if (supplier === "ottila") {
                    // await OttilaRoomRateInfo.create({
                    //     roomCategory: updatedRateInfo?.roomCategory,
                    //     cityId: updatedRateInfo?.cityId,
                    //     nationalityId: updatedRateInfo?.nationalityId,
                    //     checkInDate: updatedRateInfo?.checkInDate,
                    //     checkOutDate: updatedRateInfo?.checkOutDate,
                    //     hCode: updatedRateInfo?.hCode,
                    //     actions: updatedRateInfo?.actions,
                    //     policies: updatedRateInfo?.policies,
                    //     amount: updatedRateInfo?.amount,
                    //     roomDetail: updatedRateInfo?.roomDetail,
                    //     orderId: b2bHotelOrder?._id,
                    //     packageRate: b2bHotelOrder?.detailsKey?.split("|")[3],
                    // });

                    await OttilaRoomRateInfo.findOneAndUpdate(
                        { rateKey: matchedRate?.rateKey, resellerId: req?.reseller?._id },
                        {
                            $set: {
                                orderId: b2bHotelOrder?._id,
                            },
                        }
                    );
                } else if (supplier === "iolx") {
                    await IolxRoomRateInfo.create({
                        roomType: matchedRate?.rateInfo?.roomType,
                        orderId: b2bHotelOrder?._id,
                        nationality: matchedRate?.rateInfo?.nationality,
                        fromDate: matchedRate?.rateInfo?.fromDate,
                        toDate: matchedRate?.rateInfo?.toDate,
                        hotelCode: matchedRate?.rateInfo?.hotelCode,
                        rooms: matchedRate?.rateInfo?.rooms,
                        rateDetails: matchedRate?.rateInfo?.rateDetails,
                        policies: matchedRate?.rateInfo?.policies,
                        tokenNumber: matchedRate?.rateInfo?.tokenNumber,
                    });
                }

                if (paymentMethod === "ccavenue") {
                    const hotelOrderPayment = await B2BHotelOrderPayment.create({
                        amount: matchedRate?.netPrice + totalFee,
                        orderId: b2bHotelOrder?._id,
                        paymentState: "pending",
                        resellerId: req.reseller?._id,
                        paymentMethod: "ccavenue",
                        paymentStateMessage: "",
                    });
                    return ccavenueFormHandler({
                        res,
                        totalAmount: matchedRate?.netPrice + totalFee,
                        redirectUrl: `${process.env.SERVER_URL}/api/v1/b2b/hotels/orders/ccavenue/capture`,
                        cancelUrl: `${process.env.SERVER_URL}/api/v1/b2b/hotels/orders/ccavenue/capture`,
                        orderId: hotelOrderPayment?._id,
                    });
                }

                res.status(200).json({
                    message: "Hotel order successfully created",
                    _id: b2bHotelOrder?._id,
                    orderId: b2bHotelOrder?._id,
                    payableAmount: b2bHotelOrder?.netPrice,
                });
            }
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    completeB2bHotelOrder: async (req, res) => {
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

            const hotelProviderId = b2bHotelOrder?.detailsKey?.split("|")[0];

            const providerDetails = await B2BHotelProvider.findOne({ _id: hotelProviderId });

            if (!providerDetails) return sendErrorResponse(res, 404, "Provider details not found");

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
                try {
                    let response;
                    if (b2bHotelOrder.supplier === "hotel-beds") {
                        response = await createHotelBedBooking({
                            rateKey: b2bHotelOrder.rateKey,
                            specialRequest: b2bHotelOrder?.specialRequest,
                            travellerDetails: b2bHotelOrder?.travellerDetails,
                            rooms: b2bHotelOrder?.rooms,
                            orderId,
                            resellerId: req.reseller?._id,
                        });
                    } else if (b2bHotelOrder.supplier === "ottila") {
                        const rateInfo = await OttilaRoomRateInfo.findOne({
                            orderId: b2bHotelOrder?._id,
                        });

                        if (!rateInfo) {
                            return sendErrorResponse(res, 404, "rateInfo not found");
                        }
                        response = await createOttilaBooking(
                            rateInfo,
                            b2bHotelOrder.rateKey,
                            b2bHotelOrder.referenceNumber,
                            b2bHotelOrder?.travellerDetails,
                            b2bHotelOrder?.rooms,
                            orderId,
                            req.reseller?._id
                        );

                        rateInfo.currency = response?.Currency;
                        rateInfo.bookingStatus =
                            response?.BookingStatus === "RR"
                                ? "confirmed"
                                : response?.BookingStatus === "XX"
                                ? "cancelled"
                                : "pending";
                        rateInfo.statusCode = response?.BookingStatus;
                        rateInfo.apiRefNo = response?.APIRefNo;
                        if (response?.APIRefNo) {
                            rateInfo.bookingCompleted = true;
                        }
                        await rateInfo.save();
                    } else if (b2bHotelOrder.supplier === "iolx") {
                        const rateInfo = await IolxRoomRateInfo.findOne({
                            orderId: b2bHotelOrder?._id,
                        });

                        if (!rateInfo) {
                            return sendErrorResponse(res, 404, "rateInfo not found");
                        }
                        response = await createIOLXBooking(
                            rateInfo,
                            b2bHotelOrder.rateKey,
                            b2bHotelOrder.referenceNumber,
                            b2bHotelOrder?.travellerDetails,
                            b2bHotelOrder?.rooms
                        );

                        response.reference = response?.BookingNumber;
                        response.status = response?.BookingStatus?.toUpperCase();

                        rateInfo.bookingStatus = response?.BookingStatus?.toLowerCase();
                        rateInfo.bookingNumber = response.reference;
                        rateInfo.rateDetails.subResNo = response?.SubResNo;
                        rateInfo.source = response.Source;
                        if (response.status === "CONFIRMED") {
                            rateInfo.bookingCompleted = true;
                        }
                        await rateInfo.save();
                    }

                    if (!response) {
                        await refundPaidAmount();

                        return sendErrorResponse(
                            res,
                            400,
                            "something went wrong, please try again later"
                        );
                    }

                    apiReference = response.reference || response.APIRefNo;
                    orderStaus =
                        response.status === "CONFIRMED" || response.APIRefNo
                            ? "confirmed"
                            : "booked";
                    supplierName = response?.hotel?.supplier?.name;
                    vatNumber = response?.hotel?.supplier?.vatNumber;
                    rateComments =
                        response?.hotel?.rooms[0]?.rates?.map((item) => {
                            return item?.rateComments;
                        }) || [];
                } catch (err) {
                    await refundPaidAmount();
                    throw err;
                }
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
            sendErrorResponse(res, 500, err);
        }
    },

    completeB2bHotelOrderWithCcAvenue: async (req, res) => {
        try {
            const { encResp } = req.body;

            const decryptedJsonResponse = ccav.redirectResponseToJson(encResp);
            const { order_id, order_status } = decryptedJsonResponse;

            createHotelLog({
                stepNumber: 3001,
                actionUrl: "",
                request: decryptedJsonResponse,
                response: "",
                processId: order_id,
                userId: "",
            });

            const hotelOrderPayment = await B2BHotelOrderPayment.findById(order_id);
            if (!hotelOrderPayment) {
                return sendErrorResponse(
                    res,
                    400,
                    "Hotel order payment not found!. Please check with our team if amount is debited from your bank!"
                );
            }

            const b2bHotelOrder = await B2bHotelOrder.findById(hotelOrderPayment.orderId);
            if (!b2bHotelOrder) {
                return sendErrorResponse(
                    res,
                    400,
                    "Hotel order not found!. Please check with our team if amount is debited from your bank!"
                );
            }

            if (b2bHotelOrder.status !== "created") {
                return sendErrorResponse(
                    res,
                    400,
                    "This order already completed. Check with our team if you paid multiple times."
                );
            }

            // if (new Date(b2bHotelOrder.expiresIn).getTime() < new Date().getTime()) {
            //     return sendErrorResponse(
            //         res,
            //         400,
            //         "your order is expired, please create a new order. Please check with our team if amount is debited from your bank!"
            //     );
            // }

            let wallet = await B2BWallet.findOne({ reseller: b2bHotelOrder?.reseller });
            if (!wallet) {
                wallet = await B2BWallet.create({
                    balance: 0,
                    creditAmount: 0,
                    creditUsed: 0,
                    reseller: b2bHotelOrder?.reseller,
                });
            }

            const refundPaidAmount = async () => {
                let hotelOrderRefund;
                try {
                    const hotelOrderRefund = await B2BHotelOrderRefund.create({
                        amount: b2bHotelOrder.netPrice,
                        resellerId: b2bHotelOrder?.reseller,
                        paymentMethod: "wallet",
                        orderId: b2bHotelOrder?._id,
                        note: "",
                        status: "pending",
                    });
                    await addMoneyToB2bWallet(wallet, b2bHotelOrder.netPrice);
                    hotelOrderRefund.status = "success";
                    await hotelOrderRefund.save();

                    await B2BTransaction.create({
                        reseller: b2bHotelOrder?.reseller,
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

            if (order_status !== "Success") {
                hotelOrderPayment.status = "failed";
                await hotelOrderPayment.save();

                res.writeHead(301, {
                    Location: `${process.env.B2B_WEB_URL}/hotel/invoice/error`,
                });
                res.end();
            } else {
                hotelOrderPayment.status = "success";
                await hotelOrderPayment.save();

                await B2BTransaction.create({
                    reseller: b2bHotelOrder?.reseller,
                    paymentProcessor: "ccavenue",
                    product: "hotel",
                    processId: b2bHotelOrder?._id,
                    description: `Hotel order payment`,
                    debitAmount: 0,
                    creditAmount: 0,
                    directAmount: b2bHotelOrder.netPrice,
                    closingBalance: wallet.balance,
                    dueAmount: wallet.creditUsed,
                    remark: "Hotel order payment",
                    dateTime: new Date(),
                });

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
                    try {
                        hotelBedOrder = await createHotelBedBooking({
                            rateKey: b2bHotelOrder.rateKey,
                            specialRequest: b2bHotelOrder?.specialRequest,
                            travellerDetails: b2bHotelOrder?.travellerDetails,
                            rooms: b2bHotelOrder?.rooms,
                        });
                    } catch (err) {
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
                    rateComments = hotelBedOrder?.hotel?.rooms?.[0]?.rates?.map((item) => {
                        return item?.rateComments;
                    });
                }

                b2bHotelOrder.status = orderStaus;
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
                    sendHotelConfirmationEmail({ orderId: b2bHotelOrder?._id });
                }

                res.writeHead(301, {
                    Location: `${process.env.B2B_WEB_URL}/hotel/invoice/${b2bHotelOrder?._id}`,
                });
                res.end();
            }
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    completeB2bHotelOrderPayLater: async (req, res) => {
        try {
            const { searchId, hotelId, contactDetails, travellerDetails } = req.body;
            let { rateKey } = req.body;

            const { error } = hotelOrderPayLaterSchema.validate(req.body);
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
            if (!searchResult) {
                return sendErrorResponse(
                    res,
                    404,
                    "search results not found. please search availability again"
                );
            }

            if (new Date(searchResult.expiresIn).getTime() < new Date().getTime()) {
                return res.status(400).json({
                    errorCode: "EXPIRIED",
                    message: "sorry search result expired, please search availability again",
                    hotelId,
                    fromDate: searchResult.fromDate,
                    toDate: searchResult.toDate,
                    rooms: searchResult.rooms,
                    nationality: searchResult.nationality || "",
                });
            }

            if (!isValidObjectId(hotelId)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }
            const hotel = await Hotel.findOne({
                _id: hotelId,
                isDeleted: false,
                isActive: true,
                isPublished: true,
            }).lean();
            if (!hotel) {
                return sendErrorResponse(res, 404, "hotel not found");
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
                return sendErrorResponse(res, 400, "one guest details from each room is mandatory");
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
                                rate.rateKey = rate?.rateKeyRaw;
                                rateKey = rate?.rateKeyRaw;
                                matchedRate = rate;
                                matchedRoomType = hotel?.rooms[j];
                                break;
                            }
                        }
                    }
                    break;
                }
            }
            if (!matchedRate || !matchedHotel || !matchedRoomType) {
                return sendErrorResponse(
                    res,
                    400,
                    "sorry rateKey not found, please search availability again"
                );
            }

            const rooms = searchResult?.rooms;

            if (!isValidObjectId(contactDetails?.country)) {
                return sendErrorResponse(res, 400, "invalid country id");
            }
            const country = await Country.findOne({
                _id: contactDetails?.country,
                isDeleted: false,
            });
            if (!country) {
                return sendErrorResponse(res, 404, "country not found");
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
                    if (marketStrategy?.hotel[mi]?.hotelId?.toString() === hotel?._id?.toString()) {
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
            }

            let profileMarkup;
            let b2bMarkup;
            if (req.reseller.role === "reseller") {
                profileMarkup = await B2BMarkupProfile.findOne({
                    resellerId: req.reseller?._id,
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
            if (isApiConnected === true) {
                return sendErrorResponse(
                    res,
                    400,
                    "pay later option is not available for dynamic booking"
                );
            }

            const [
                type,
                fromDate,
                toDate,
                hotelId1,
                roomTypeId,
                basePlanCode,
                mealSupplementCode,
                addOnSupplements,
                contractsObj,
                appliedPromotions,
                promotionId,
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
                return sendErrorResponse(res, 400, "invalid dates. please select a valid dates");
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
                promotionId,
            });
            if (!response) {
                return sendErrorResponse(res, 400, "something went wrong, try again");
            }

            if (
                response?.payLaterAvailable === false ||
                response?.lastDateForPayment < new Date(new Date().setHours(0, 0, 0, 0))
            ) {
                return sendErrorResponse(
                    res,
                    400,
                    "pay later option is not available for this booking"
                );
            }

            const totalFee = 0;

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
                nationality: searchResult?.nationality || null,
                isTourismFeeIncluded: response?.isTourismFeeIncluded,
                cancellaPolicies: response?.cancellationPolicies,
                cancellationType: response?.cancellationType,
                expiresIn: new Date(new Date().setMinutes(new Date().getMinutes() + 10)),
                searchId,
                paymentState: "non-paid",
                lastDateForPayment: response?.lastDateForPayment,
                totalFee,
            });
            await b2bHotelOrder.save();

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

            b2bHotelOrder.status = "booked";
            b2bHotelOrder.lastStatusChange = new Date();
            b2bHotelOrder.supplierName = "Traveller's Choice Travel & Tourism LLC";
            b2bHotelOrder.vatNumber = "100359576400003";
            await b2bHotelOrder.save();

            sendHotelReservationEmail({ orderId: b2bHotelOrder?._id });
            B2BHotelPayLaterCronJob.create({
                expiryDate: b2bHotelOrder.lastDateForPayment,
                expiryDatePluOne: new Date(
                    new Date(b2bHotelOrder.lastDateForPayment).setDate(
                        new Date(b2bHotelOrder.lastDateForPayment).getDate() + 1
                    )
                ),
                resellerId: b2bHotelOrder?.reseller,
                hotelOrder: b2bHotelOrder?._id,
            });

            res.status(200).json({
                _id: b2bHotelOrder?._id,
                referenceNumber: b2bHotelOrder.referenceNumber,
                message: "hotel successfully booked",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    hotelOrderInitiatePayment: async (req, res) => {
        try {
            const { paymentMethod, orderId } = req.body;

            const { error } = hotelOrderInitiatePaymentSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid hotel order id");
            }
            const b2bHotelOrder = await B2bHotelOrder.findOne({
                _id: orderId,
                reseller: req.reseller?._id,
            });
            if (!b2bHotelOrder) {
                return sendErrorResponse(res, 404, "hotel order not found");
            }

            if (b2bHotelOrder.paymentState === "fully-paid") {
                return sendErrorResponse(
                    res,
                    400,
                    "you have already completed payment for this order"
                );
            }

            if (b2bHotelOrder.lastDateForPayment < new Date(new Date().setHours(0, 0, 0, 0))) {
                return sendErrorResponse(res, 400, "last date for payment completion is expired");
            }

            const hotelOrderPayment = await B2BHotelOrderPayment.create({
                amount: b2bHotelOrder?.netPrice,
                orderId: b2bHotelOrder?._id,
                paymentState: "pending",
                resellerId: req.reseller?._id,
                paymentMethod,
                paymentStateMessage: "",
            });
            if (paymentMethod === "wallet") {
                let wallet = await B2BWallet.findOne({
                    reseller: req.reseller?._id,
                });
                const balanceAvailable = checkWalletBalance(wallet, b2bHotelOrder.netPrice);
                if (!balanceAvailable) {
                    return sendErrorResponse(
                        res,
                        400,
                        "Insufficient balance. please reacharge and try again"
                    );
                }

                b2bHotelOrder.otp = sendOtpEmail({
                    agentName: req.reseller?.name,
                    email: req.reseller?.email,
                    product: "Hotel",
                    referenceNumber: b2bHotelOrder.referenceNumber,
                });
                await b2bHotelOrder.save();

                res.status(200).json({
                    message: "payment successfully initiated",
                    paymentId: hotelOrderPayment?._id,
                });
            } else {
                return ccavenueFormHandler({
                    res,
                    totalAmount: b2bHotelOrder?.netPrice,
                    redirectUrl: `${process.env.SERVER_URL}/api/v1/b2b/hotels/orders/payments/ccavenue/capture`,
                    cancelUrl: `${process.env.SERVER_URL}/api/v1/b2b/hotels/orders/payments/ccavenue/capture`,
                    orderId: hotelOrderPayment?._id,
                });
            }
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    hotelOrderCompleteWalletPayment: async (req, res) => {
        try {
            const { paymentId } = req.params;
            const { otp } = req.body;

            if (!isValidObjectId(paymentId)) {
                return sendErrorResponse(res, 400, "invalid hote order payment id");
            }
            const hotelOrderPayment = await B2BHotelOrderPayment.findById(paymentId);
            if (!hotelOrderPayment) {
                return sendErrorResponse(res, 404, "hotel order payment not found");
            }
            if (hotelOrderPayment.paymentState !== "pending") {
                return sendErrorResponse(res, 404, "payment is already completed or failed");
            }

            const b2bHotelOrder = await B2bHotelOrder.findOne({ _id: hotelOrderPayment.orderId });
            if (!b2bHotelOrder) {
                return sendErrorResponse(res, 404, "hotel order not found");
            }

            if (b2bHotelOrder.paymentState === "fully-paid") {
                return sendErrorResponse(
                    res,
                    404,
                    "this hotel order's payment is already completed"
                );
            }

            if (b2bHotelOrder.lastDateForPayment < new Date(new Date().setHours(0, 0, 0, 0))) {
                return sendErrorResponse(res, 400, "last date for payment completion is expired");
            }

            if (!b2bHotelOrder.otp || b2bHotelOrder.otp !== Number(otp)) {
                return sendErrorResponse(res, 400, "incorrect otp!");
            }

            let wallet = await B2BWallet.findOne({
                reseller: req.reseller?._id,
            });
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

            b2bHotelOrder.paymentState = "fully-paid";
            await b2bHotelOrder.save();

            sendHotelOrderPaymentCompletionEmail({ orderId: b2bHotelOrder?._id });

            res.status(200).json({
                message: "hotel order payment successfully completed",
                orderId: b2bHotelOrder?._id,
                paymentId,
                paymentState: b2bHotelOrder.paymentState,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    hotelOrderCompleteCcAvenuePayment: async (req, res) => {
        try {
            const { encResp } = req.body;

            const decryptedJsonResponse = ccav.redirectResponseToJson(encResp);
            const { order_id, order_status } = decryptedJsonResponse;

            const hotelOrderPayment = await B2BHotelOrderPayment.findById(order_id);
            if (!hotelOrderPayment) {
                return sendErrorResponse(
                    res,
                    400,
                    "Hotel order payment not found!. Please check with our team if amount is debited from your bank!"
                );
            }

            const b2bHotelOrder = await B2bHotelOrder.findById(hotelOrderPayment.orderId);
            if (!b2bHotelOrder) {
                return sendErrorResponse(
                    res,
                    400,
                    "Hotel order not found!. Please check with our team if amount is debited from your bank!"
                );
            }

            if (order_status !== "Success") {
                hotelOrderPayment.paymentState = "failed";
                await hotelOrderPayment.save();

                res.writeHead(301, {
                    Location: `${process.env.B2B_WEB_URL}/hotel/invoice/error`,
                });
                res.end();
            } else {
                hotelOrderPayment.paymentState = "success";
                await hotelOrderPayment.save();

                const wallet = await B2BWallet.findOne({ reseller: b2bHotelOrder.reseller });

                await B2BTransaction.create({
                    reseller: b2bHotelOrder?.reseller,
                    paymentProcessor: "ccavenue",
                    product: "hotel",
                    processId: b2bHotelOrder?._id,
                    description: `Hotel order payment`,
                    debitAmount: 0,
                    creditAmount: 0,
                    directAmount: b2bHotelOrder.netPrice,
                    closingBalance: wallet.balance || 0,
                    dueAmount: wallet.creditUsed || 0,
                    remark: "Hotel order payment",
                    dateTime: new Date(),
                });

                b2bHotelOrder.paymentState = "fully-paid";
                await b2bHotelOrder.save();

                sendHotelOrderPaymentCompletionEmail({ orderId: b2bHotelOrder?._id });

                res.writeHead(301, {
                    Location: `${process.env.B2B_WEB_URL}/hotel/invoice/${b2bHotelOrder?._id}`,
                });
                res.end();
            }
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleB2bsAllHotelOrders: async (req, res) => {
        try {
            const { skip = 0, limit = 10 } = req.query;

            const hotelOrders = await B2bHotelOrder.find({ reseller: req.reseller?._id })
                .populate("hotel", "hotelName address images")
                .populate("reseller", "agentCode companyName")
                .populate("roomType", "roomName")
                .populate("basePlan", "boardName")
                .populate("extraMealSupplement", "boardName")
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalHotelOrders = await B2bHotelOrder.find({
                reseller: req.reseller?._id,
            }).count();

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

    getSingleHotelOrderB2b: async (req, res) => {
        try {
            const { orderId } = req.params;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

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

            if (!hotelOrder) {
                return sendErrorResponse(res, 404, "hotel order not found");
            }

            res.status(200).json(hotelOrder);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    cancelB2bHotelOrder: async (req, res) => {
        try {
            const { orderId } = req.params;
            const { cancellationRemark } = req.body;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }
            const orderDetail = await B2bHotelOrder.findOne({
                _id: orderId,
                reseller: req.reseller?._id,
            }).populate("reseller", "_id role name email referredBy");
            if (!orderDetail) {
                return sendErrorResponse(res, 404, "order details not found");
            }

            if (orderDetail.status === "cancelled") {
                return sendErrorResponse(res, 400, "sorry, this order is already cancelled.");
            }

            if (orderDetail.status !== "booked" && orderDetail.status !== "confirmed") {
                return sendErrorResponse(res, 400, "sorry, this order can't cancel right now.");
            }

            if (new Date(orderDetail.fromDate) <= new Date(new Date().setHours(0, 0, 0, 0))) {
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
                    orderDetail.isCancellationPending === true
                ) {
                    return sendErrorResponse(
                        res,
                        400,
                        "sorry, this order already submitted cancellation request."
                    );
                } else if (orderCancellation.cancellationStatus === "success") {
                    return sendErrorResponse(res, 400, "sorry, this order is already cancelled.");
                }
            } else {
                orderCancellation = await B2BHotelOrderCancellation.create({
                    cancellationProvider: orderDetail.supplier,
                    cancellationRemark,
                    cancellationStatus: "pending",
                    orderId,
                    resellerId: req.reseller?._id,
                    cancelledBy: "b2b",
                });
            }

            if (orderDetail.isApiConnected === true) {
                let cancellationCharge = 0;
                let response;

                if (orderDetail.supplier === "ottila") {
                    response = await cancelOttilaHotelBooking(
                        orderDetail.hotelBookingId,
                        orderDetail?._id,
                        req.reseller?._id
                    );

                    if (
                        response &&
                        response.APIRefNo &&
                        response.APIRefNo === orderDetail.hotelBookingId &&
                        response.BookingStatus &&
                        response.BookingStatus !== BOOKING_CANCEL_STATUS.CANCELLED.code
                    ) {
                        return sendErrorResponse(
                            res,
                            500,
                            "something went wrong!, try after some time."
                        );
                    }

                    const rateInfo = await OttilaRoomRateInfo.findOne({ orderId: orderDetail._id });

                    rateInfo?.policies?.forEach((policy) => {
                        policy?.CancellationPolicy?.forEach((p) => {
                            const today = moment();
                            const fromDate = moment(new Date(p?.FromDate));
                            const toDate = moment(new Date(p?.ToDate));

                            if (fromDate.isSameOrBefore(today) && toDate.isSameOrAfter(today)) {
                                cancellationCharge += p?.Amount;
                            }
                        });
                    });

                    await OttilaRoomRateInfo.updateOne(
                        { orderId: orderDetail._id },
                        { $set: { bookingStatus: "cancelled" } }
                    );
                } else if (orderDetail.supplier === "iolx") {
                    const rateInfo = await IolxRoomRateInfo.findOne({ orderId: orderDetail._id });
                    response = await cancelIOLXHotelBooking(rateInfo);
                    if (
                        response &&
                        (!response.BookingDetails ||
                            response.BookingDetails?.BookingNumber !== rateInfo.bookingNumber)
                    ) {
                        return sendErrorResponse(res, 500, "something went wrong!.");
                    }
                    rateInfo.bookingStatus = "cancelled";
                    cancellationCharge = response?.TotalAmount;
                    await rateInfo.save();
                } else {
                    response = await cancelHotelBedBooking({
                        bookingReference: orderDetail.hotelBookingId,
                    });
                    cancellationCharge = response?.hotel?.cancellationAmount;
                }

                if (!response) {
                    return sendErrorResponse(res, 500, "something went wrong!.");
                }

                orderCancellation.cancellationStatus = "success";
                orderCancellation.cancellationChargeHotelBed = response?.hotel?.cancellationAmount;
                orderCancellation.cancellationCharge = response?.hotel?.cancellationAmount;

                orderDetail.status = "cancelled";

                const refundAmount = orderDetail.netPrice - (cancellationCharge || 0);
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

                    hotelOrderRefund.status = "success";
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
                    email: orderDetail?.reseller?.email,
                    name: orderDetail?.reseller?.name,
                    referenceNumber: orderDetail?.referenceNumber,
                });
            } else {
                orderDetail.isCancellationPending = true;
                hotelOrderCancellationRequestEmailForReseller({
                    email: orderDetail?.reseller?.email,
                    name: orderDetail?.reseller?.name,
                    referenceNumber: orderDetail?.referenceNumber,
                });
                hotelOrderCancellationRequestEmailForDpt({
                    name: orderDetail?.reseller?.name,
                    referenceNumber: orderDetail?.referenceNumber,
                    mainAgentId:
                        orderDetail?.reseller?.role === "reseller"
                            ? orderDetail?.reseller?._id
                            : orderDetail?.reseller?.referredBy,
                });
            }

            await orderCancellation.save();
            await orderDetail.save();

            res.status(200).json({
                message: "order cancellation request successfully submitted.",
                status: orderDetail.status,
                cancelledBy: orderDetail.cancelledBy,
                cancellationRemark: orderDetail.cancellationRemark,
                isCancellationPending: orderDetail?.isCancellationPending,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    downloadHotelOrderVoucher: async (req, res) => {
        try {
            const { orderId } = req.params;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid hotel order id");
            }

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
            if (!hotelOrder) {
                return sendErrorResponse(res, 404, "hotel order not found");
            }

            if (hotelOrder.status !== "confirmed") {
                return sendErrorResponse(res, 400, "sorry, hotel order not confirmed");
            }

            if (!hotelOrder?.roomType && !hotelOrder?.roomType?.roomName) {
                const roomType = {
                    roomName: "",
                };
                if (hotelOrder.supplier === "ottila") {
                    const rateInfo = await OttilaRoomRateInfo.findOne({ orderId });
                    roomType.roomName = rateInfo.roomCategory;
                    hotelOrder.roomType = roomType;
                } else if (hotelOrder.supplier === "iolx") {
                    const rateInfo = await IolxRoomRateInfo.findOne({ orderId });
                    roomType.roomName = rateInfo.roomType;
                    hotelOrder.roomType = roomType;
                }
            }

            const pdfBuffer = await createHotelVoucher({ hotelOrder });

            res.set({
                "Content-Type": "application/pdf",
                "Content-Disposition": "attachment; filename=voucher.pdf",
            });
            res.send(pdfBuffer);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    downloadHotelOrderInvoice: async (req, res) => {
        try {
            const { orderId } = req.params;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid hotel order id");
            }

            const hotelOrder = await B2bHotelOrder.findOne({
                _id: orderId,
                reseller: req.reseller?._id,
            })
                .select("_id status")
                .lean();
            if (!hotelOrder) {
                return sendErrorResponse(res, 404, "hotel order not found");
            }

            if (hotelOrder.status === "pending") {
                return sendErrorResponse(res, 400, "sorry, hotel order not completed");
            }

            const pdfBuffer = await createB2bHotelOrderInvoice({
                orderId,
                resellerId: req.reseller?._id,
            });

            res.set({
                "Content-Type": "application/pdf",
                "Content-Disposition": "attachment; filename=invoice.pdf",
            });
            res.send(pdfBuffer);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
