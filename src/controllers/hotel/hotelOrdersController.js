const { isValidObjectId } = require("mongoose");
const nodeCCAvenue = require("node-ccavenue");

const { sendErrorResponse, userOrderSignUpEmail } = require("../../helpers");
const { Country, User, B2CTransaction, B2CWallet } = require("../../models");
const {
    Hotel,
    RoomType,
    HotelAllocation,
    HotelBoardType,
    HotelAvailSearchResult,
    HotelOrder,
    HotelOrderPayment,
    HotelOrderRefund,
} = require("../../models/hotel");
const { getSingleHotelBasePlanPriceORD } = require("../../b2b/helpers/hotel/hotelOrderHelpers");

const {
    hotelOrderSchema,
    hotelOrderPayLaterSchema,
    hotelOrderInitiatePaymentSchema,
} = require("../../b2b/validations/hotel/hotelOrder.schema");
const { generateUniqueString, ccavenueFormHandler } = require("../../utils");
const {
    createHotelBedBooking,
    cancelHotelBedBooking,
} = require("../../b2b/helpers/hotel/hotelBedAvailabilityHelpers");
const { createHotelVoucher } = require("../../b2b/helpers/hotel/hotelVoucherHelpers");
const B2BClientHotelMarkup = require("../../b2b/models/hotel/b2bClientHotelMarkup.model");
const { sendHotelConfirmationEmail } = require("../../helpers/hotel");
const { createB2bHotelOrderInvoice } = require("../../b2b/helpers/hotel");
const {
    hotelOrderConfirmationEmail,
    cancellationConfirmationEmailToReseller,
    hotelOrderCancellationRequestEmailForDpt,
    hotelOrderCancellationRequestEmailForReseller,
    sendHotelReservationEmail,
    sendHotelOrderPaymentCompletionEmail,
} = require("../../helpers/hotel/email");

const { createHotelLog } = require("../../helpers/hotel/hotelLogsHelpers");
const { sendOtpEmail } = require("../../b2b/helpers/global");
const addMoneyToB2cWallet = require("../../utils/wallet/addMoneyToB2cWallet");

const ccav = new nodeCCAvenue.Configure({
    merchant_id: process.env.CCAVENUE_MERCHANT_ID,
    working_key: process.env.CCAVENUE_WORKING_KEY,
});

module.exports = {
    createB2bHotelOrder: async (req, res) => {
        try {
            const { searchId, hotelId, contactDetails, rateKey, paymentMethod, travellerDetails } =
                req.body;

            createHotelLog({
                stepNumber: 2001,
                actionUrl: "",
                request: req.body,
                response: "",
                processId: searchId,
                // userId: req.reseller?._id,
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
                // resellerId: req.reseller?._id,
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
                // userId: req.reseller?._id,
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

            // let clientMarkup = await B2BClientHotelMarkup.findOne({
            //     roomTypeId: matchedRoomType?.roomTypeId,
            //     resellerId: req.reseller?._id,
            // });
            // if (!clientMarkup) {
            //     clientMarkup = await B2BClientStarCategoryMarkup.findOne({
            //         resellerId: req.reseller?._id,
            //         name: hotel?.starCategory,
            //     });
            // }
            let user;
            if (!req.user) {
                user = await User.findOne({ email });
                if (!user) {
                    async function generateRandomPassword() {
                        const capitalLetters = "EFGHABCDPQRSTUVIJKLMNOWXYZ";
                        const smallLetters = "abcderstuvwxyzfghijklmnopq"; // Added small letters
                        const numbers = "0123456789";
                        const specialChars = "@";
                        const allChars = capitalLetters + smallLetters + numbers + specialChars; // Added small letters

                        let password = "";

                        // Add one capital letter
                        password += capitalLetters.charAt(
                            Math.floor(Math.random() * capitalLetters.length)
                        );

                        // Add one small letter
                        password += smallLetters.charAt(
                            Math.floor(Math.random() * smallLetters.length)
                        );

                        // Add one number
                        password += numbers.charAt(Math.floor(Math.random() * numbers.length));

                        // Add one "@" symbol
                        password += "@";

                        // Add two random characters from the combined set (to total 5 characters)
                        for (let i = 0; i < 2; i++) {
                            password += allChars.charAt(
                                Math.floor(Math.random() * allChars.length)
                            );
                        }

                        // Shuffle the characters of the password to randomize their positions
                        password = password
                            .split("")
                            .sort(() => Math.random() - 0.5)
                            .join("");

                        return password;
                    }

                    // Example usage:
                    const password = await generateRandomPassword();
                    console.log(password);
                    const hashedPassowrd = await hash(password, 8);

                    user = new User({
                        name: contactDetails?.name,
                        email: contactDetails?.email,
                        phoneNumber: contactDetails?.phoneNumber,
                        country: contactDetails?.country,
                        password: hashedPassowrd,
                    });
                    await user.save();

                    userOrderSignUpE12345
                    mail(
                        email,
                        "New Account",
                        `username : ${email} password : ${password}`
                    );
                }
            }

            let buyer = req.user || user;

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
                    userId: buyer?._id,
                });

                let currentNetPrice = response?.netPrice;

                // agent to clinet markup
                // let clMarkup = 0;
                // if (clientMarkup && !isNaN(clientMarkup.markup)) {
                //     if (clientMarkup.markupType === "flat") {
                //         clMarkup = clientMarkup.markup * matchedHotel.noOfNights;
                //     } else {
                //         clMarkup = (currentNetPrice / 100) * clientMarkup.markup;
                //     }
                // }
                // currentNetPrice += clMarkup;

                // let totalMarkup = adminMarketMarkup + adminB2bMarkup + saMarkup + clMarkup;
                const orderRefNumber = generateUniqueString("B2CHOT");

                const b2bHotelOrder = new HotelOrder({
                    ...req.body,
                    rooms,
                    roomsCount: rooms?.length,
                    mealSupplementPrice: response?.mealSupplementPrice,
                    extraBedSupplementPrice: response?.extraBedSupplementPrice,
                    childSupplementPrice: response?.childSupplementPrice,
                    totalOffer: response?.totalOffer,
                    grossPrice: response?.grossPrice + totalMarkup,
                    netPrice: currentNetPrice,

                    // totalMarkup,
                    contracts: response?.contractsWithPrice,
                    status: "created",
                    extraMealSupplement: response?.extraMealSupplement
                        ? response?.extraMealSupplement
                        : null,
                    basePlan: response?.basePlan,
                    roomType: roomTypeId,
                    hotel: hotelId,
                    referenceNumber: orderRefNumber,
                    user: buyer?._id,
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

                    const hotelOrderPayment = await HotelOrderPayment.create({
                        amount: matchedRate?.netPrice,
                        orderId: b2bHotelOrder?._id,
                        paymentState: "pending",
                        userId: buyer?._id,
                        paymentMethod: "ccavenue",
                        paymentStateMessage: "",
                    });
                    return ccavenueFormHandler({
                        res,
                        totalAmount: matchedRate?.netPrice,
                        redirectUrl: `${process.env.SERVER_URL}/api/v1/b2b/hotels/orders/ccavenue/capture`,
                        cancelUrl: `${process.env.SERVER_URL}/api/v1/b2b/hotels/orders/ccavenue/capture`,
                        orderId: hotelOrderPayment?._id,
                    });
                }

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

                const orderRefNumber = generateUniqueString("B2BHOT");

                const b2bHotelOrder = new HotelOrder({
                    ...req.body,
                    roomsCount: rooms?.length,
                    rooms,
                    mealSupplementPrice: 0,
                    extraBedSupplementPrice: 0,
                    childSupplementPrice: 0,
                    totalOffer: matchedRate?.totalOffer,
                    grossPrice: matchedRate?.grossPrice,
                    netPrice: matchedRate?.netPrice,

                    // totalMarkup:
                    //     matchedRate?.markup?.adminMarketMarkup +
                    //     matchedRate?.markup?.adminB2bMarkup +
                    //     matchedRate?.markup?.subAgentMarkup +
                    //     matchedRate?.markup?.clientMarkup,
                    contracts: [],
                    status: "created",
                    extraMealSupplement: null,
                    basePlan: null,
                    hotel: hotel?._id,
                    roomType: matchedRoomType?.roomTypeId,
                    referenceNumber: orderRefNumber,
                    user: buyer?._id,
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

                if (paymentMethod === "ccavenue") {
                    const hotelOrderPayment = await HotelOrderPayment.create({
                        amount: matchedRate?.netPrice,
                        orderId: b2bHotelOrder?._id,
                        paymentState: "pending",
                        userId: buyer?._id,
                        paymentMethod: "ccavenue",
                        paymentStateMessage: "",
                    });
                    return ccavenueFormHandler({
                        res,
                        totalAmount: matchedRate?.netPrice,
                        redirectUrl: `${process.env.SERVER_URL}/api/v1/b2b/hotels/orders/ccavenue/capture`,
                        cancelUrl: `${process.env.SERVER_URL}/api/v1/b2b/hotels/orders/ccavenue/capture`,
                        orderId: hotelOrderPayment?._id,
                    });
                }

                res.status(200).json(b2bHotelOrder);
            }
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

            const hotelOrderPayment = await HotelOrderPayment.findById(order_id);
            if (!hotelOrderPayment) {
                return sendErrorResponse(
                    res,
                    400,
                    "Hotel order payment not found!. Please check with our team if amount is debited from your bank!"
                );
            }

            const b2bHotelOrder = await HotelOrder.findById(hotelOrderPayment.orderId);
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
            let wallet = await B2CWallet.findOne({ reseller: b2bHotelOrder?.reseller });
            if (!wallet) {
                wallet = await B2CWallet.create({
                    balance: 0,
                    user: b2bHotelOrder?.reseller,
                });
            }

            // if (new Date(b2bHotelOrder.expiresIn).getTime() < new Date().getTime()) {
            //     return sendErrorResponse(
            //         res,
            //         400,
            //         "your order is expired, please create a new order. Please check with our team if amount is debited from your bank!"
            //     );
            // }

            const refundPaidAmount = async () => {
                let hotelOrderRefund;
                try {
                    const hotelOrderRefund = await HotelOrderRefund.create({
                        amount: b2bHotelOrder.netPrice,
                        userId: b2bHotelOrder?.user,
                        paymentMethod: "wallet",
                        orderId: b2bHotelOrder?._id,
                        note: "",
                        status: "pending",
                    });
                    await addMoneyToB2cWallet(wallet, b2bHotelOrder.netPrice);
                    hotelOrderRefund.status = "success";
                    await hotelOrderRefund.save();

                    await B2CTransaction.create({
                        user: b2bHotelOrder?.user,
                        paymentProcessor: "wallet",
                        product: "hotel",
                        processId: b2bHotelOrder?._id,
                        description: `Hotel order refund`,
                        debitAmount: 0,
                        creditAmount: b2bHotelOrder.netPrice,
                        directAmount: 0,
                        closingBalance: wallet.balance,
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

                await B2CTransaction.create({
                    user: b2bHotelOrder?.user,
                    paymentProcessor: "ccavenue",
                    product: "hotel",
                    processId: b2bHotelOrder?._id,
                    description: `Hotel order payment`,
                    amount: b2bHotelOrder.netPrice,
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

    getSingleB2bsAllHotelOrders: async (req, res) => {
        try {
            const { skip = 0, limit = 10 } = req.query;

            const hotelOrders = await HotelOrder.find({ reseller: req.reseller?._id })
                .populate("hotel", "hotelName address images")
                .populate("reseller", "agentCode companyName")
                .populate("roomType", "roomName")
                .populate("basePlan", "boardName")
                .populate("extraMealSupplement", "boardName")
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalHotelOrders = await HotelOrder.count();

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

            const hotelOrder = await HotelOrder.findOne({
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
            const orderDetail = await HotelOrder.findOne({
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

            let orderCancellation = await HotelOrderCancellation.findOne({
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
                    cancellationProvider:
                        orderDetail.isApiConnected === true ? "hotel-beds" : "tctt",
                    cancellationRemark,
                    cancellationStatus: "pending",
                    orderId,
                    resellerId: req.reseller?._id,
                    cancelledBy: "b2b",
                });
            }

            if (orderDetail.isApiConnected === true) {
                const response = await cancelHotelBedBooking({
                    bookingReference: orderDetail.hotelBookingId,
                });

                orderCancellation.cancellationStatus = "success";
                orderCancellation.cancellationChargeHotelBed = response?.hotel?.cancellationAmount;
                orderCancellation.cancellationCharge = response?.hotel?.cancellationAmount;

                orderDetail.status === "cancelled";

                const refundAmount = orderDetail.netPrice - response?.hotel?.cancellationAmount;
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
