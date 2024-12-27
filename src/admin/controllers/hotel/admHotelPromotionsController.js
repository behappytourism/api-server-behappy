const { isValidObjectId, Types } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { HotelPromotion, Hotel, HotelContractGroup } = require("../../../models/hotel");
const { hotelPromotionSchema } = require("../../validations/hotel/hotelPromotion.schema");
const { checkPromoDateDefaultValidations } = require("../../helpers/hotel/hotelPromotionsHelpers");

module.exports = {
    addNewHotelPromotion: async (req, res) => {
        try {
            const {
                hotel,
                contractGroups,
                isCombinedPromotion,
                combinedPromotions,
                sellFrom,
                sellTo,
                bookingWindowFrom,
                bookingWindowTo,
                discounts,
                stayPays,
                roomTypeUpgrades,
                mealUpgrades,
                roomDiscounts,
                cancellationPolicies,
                specificNations,
                applicableNations,
            } = req.body;

            const { _, error } = hotelPromotionSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(hotel)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }

            const hotelDetail = await Hotel.findOne({
                _id: hotel,
                isDeleted: false,
                isPublished: true,
            });
            if (!hotelDetail) {
                return sendErrorResponse(res, 404, "hotel not found");
            }

            for (let i = 0; i < combinedPromotions?.length; i++) {
                if (!isValidObjectId(combinedPromotions[i])) {
                    return sendErrorResponse(res, 400, "invalid combined promotion id");
                }
            }

            // combined promotions validation
            if (isCombinedPromotion === true) {
                for (let i = 0; i < combinedPromotions?.length; i++) {
                    if (!isValidObjectId(combinedPromotions[i])) {
                        return sendErrorResponse(res, 400, "invalid combined promotion id");
                    }
                }
                const combinePromotionDetail = await HotelPromotion.find({
                    _id: combinedPromotions,
                    isDeleted: false,
                });
                if (
                    !combinePromotionDetail ||
                    combinePromotionDetail?.length !== combinedPromotions?.length
                ) {
                    return sendErrorResponse(res, 404, "combined promotions not found");
                }
            }

            const contractGroupsDetails = await HotelContractGroup.find({
                _id: contractGroups,
            }).lean();
            if (contractGroupsDetails.length < 1) {
                return sendErrorResponse(res, 400, "please select minimum one contract group");
            }

            if (new Date(sellFrom) > new Date(sellTo)) {
                return sendErrorResponse(res, 400, "please enter valid sellFrom and sellTo date.");
            }

            if (new Date(bookingWindowFrom) > new Date(bookingWindowTo)) {
                return sendErrorResponse(
                    res,
                    400,
                    "please enter valid bookingWindowFrom and bookingWindowTo date."
                );
            }

            if (discounts && discounts?.length > 0) {
                const rateDateRangeValidation = checkPromoDateDefaultValidations(
                    discounts,
                    sellFrom,
                    sellTo
                );
                if (rateDateRangeValidation === false) {
                    return sendErrorResponse(
                        res,
                        400,
                        "discounts should be between contract's validity, toDate should be greater than or equal to fromDate"
                    );
                }
            }

            if (stayPays && stayPays?.length > 0) {
                const rateDateRangeValidation = checkPromoDateDefaultValidations(
                    stayPays,
                    sellFrom,
                    sellTo
                );
                if (rateDateRangeValidation === false) {
                    return sendErrorResponse(
                        res,
                        400,
                        "stayPays should be between contract's validity, toDate should be greater than or equal to fromDate"
                    );
                }
            }

            if (roomTypeUpgrades && roomTypeUpgrades?.length > 0) {
                const rateDateRangeValidation = checkPromoDateDefaultValidations(
                    roomTypeUpgrades,
                    sellFrom,
                    sellTo
                );
                if (rateDateRangeValidation === false) {
                    return sendErrorResponse(
                        res,
                        400,
                        "roomTypeUpgrades should be between contract's validity, toDate should be greater than or equal to fromDate"
                    );
                }
            }

            if (mealUpgrades && mealUpgrades?.length > 0) {
                const rateDateRangeValidation = checkPromoDateDefaultValidations(
                    mealUpgrades,
                    sellFrom,
                    sellTo
                );
                if (rateDateRangeValidation === false) {
                    return sendErrorResponse(
                        res,
                        400,
                        "mealUpgrades should be between contract's validity, toDate should be greater than or equal to fromDate"
                    );
                }
            }

            if (roomDiscounts && roomDiscounts?.length > 0) {
                const rateDateRangeValidation = checkPromoDateDefaultValidations(
                    roomDiscounts,
                    sellFrom,
                    sellTo
                );
                if (rateDateRangeValidation === false) {
                    return sendErrorResponse(
                        res,
                        400,
                        "roomDiscounts should be between contract's validity, toDate should be greater than or equal to fromDate"
                    );
                }
            }

            if (cancellationPolicies && cancellationPolicies?.length > 0) {
                const rateDateRangeValidation = checkPromoDateDefaultValidations(
                    cancellationPolicies,
                    sellFrom,
                    sellTo
                );
                if (rateDateRangeValidation === false) {
                    return sendErrorResponse(
                        res,
                        400,
                        "cancellationPolicies should be between contract's validity, toDate should be greater than or equal to fromDate"
                    );
                }

                for (let policy of cancellationPolicies) {
                    if (
                        policy?.daysBefore &&
                        policy?.daysBefore >= policy?.requestCancelDaysBefore
                    ) {
                        return sendErrorResponse(
                            res,
                            400,
                            "Cancel Booking Before should be less than days before"
                        );
                    }
                }
            }

            const newPromotion = new HotelPromotion({
                ...req.body,
                combinedPromotions: isCombinedPromotion === true ? combinedPromotions : [],
                applicableNations: specificNations === true ? applicableNations : [],
                contractGroups: contractGroupsDetails,
            });
            await newPromotion.save();

            res.status(200).json(newPromotion);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateHotelPromotion: async (req, res) => {
        try {
            const { id } = req.params;
            const {
                hotel,
                contractGroups,
                isCombinedPromotion,
                combinedPromotions,
                sellFrom,
                sellTo,
                bookingWindowFrom,
                bookingWindowTo,
                discounts,
                stayPays,
                roomTypeUpgrades,
                mealUpgrades,
                roomDiscounts,
                cancellationPolicies,
                specificNations,
                applicableNations,
            } = req.body;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 500, "invalid promotion id");
            }

            const { _, error } = hotelPromotionSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(hotel)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }

            const hotelDetail = await Hotel.findOne({
                _id: hotel,
                isDeleted: false,
                isPublished: true,
            });
            if (!hotelDetail) {
                return sendErrorResponse(res, 404, "hotel not found");
            }

            // combined promotions validation
            let combinePromotionDetail = [];
            if (isCombinedPromotion === true) {
                for (let i = 0; i < combinedPromotions?.length; i++) {
                    if (!isValidObjectId(combinedPromotions[i])) {
                        return sendErrorResponse(res, 400, "invalid combined promotion id");
                    }
                    if (combinedPromotions[i] === id) {
                        return sendErrorResponse(
                            res,
                            400,
                            "sorry, you can't combine same promotion"
                        );
                    }
                }
                combinePromotionDetail = await HotelPromotion.find({
                    _id: combinedPromotions,
                    isDeleted: false,
                });
            }

            const contractGroupsDetails = await HotelContractGroup.find({
                _id: contractGroups,
            }).lean();
            if (contractGroupsDetails.length < 1) {
                return sendErrorResponse(res, 400, "please select minimum one contract group");
            }

            if (new Date(sellFrom) > new Date(sellTo)) {
                return sendErrorResponse(res, 400, "please enter valid sellFrom and sellTo date.");
            }

            if (new Date(bookingWindowFrom) > new Date(bookingWindowTo)) {
                return sendErrorResponse(
                    res,
                    400,
                    "please enter valid bookingWindowFrom and bookingWindowTo date."
                );
            }

            if (discounts && discounts?.length > 0) {
                const rateDateRangeValidation = checkPromoDateDefaultValidations(
                    discounts,
                    sellFrom,
                    sellTo
                );
                if (rateDateRangeValidation === false) {
                    return sendErrorResponse(
                        res,
                        400,
                        "discounts should be between contract's validity, toDate should be greater than or equal to fromDate"
                    );
                }
            }

            if (stayPays && stayPays?.length > 0) {
                const rateDateRangeValidation = checkPromoDateDefaultValidations(
                    stayPays,
                    sellFrom,
                    sellTo
                );
                if (rateDateRangeValidation === false) {
                    return sendErrorResponse(
                        res,
                        400,
                        "stayPays should be between contract's validity, toDate should be greater than or equal to fromDate"
                    );
                }
            }

            if (roomTypeUpgrades && roomTypeUpgrades?.length > 0) {
                const rateDateRangeValidation = checkPromoDateDefaultValidations(
                    roomTypeUpgrades,
                    sellFrom,
                    sellTo
                );
                if (rateDateRangeValidation === false) {
                    return sendErrorResponse(
                        res,
                        400,
                        "roomTypeUpgrades should be between contract's validity, toDate should be greater than or equal to fromDate"
                    );
                }
            }

            if (mealUpgrades && mealUpgrades?.length > 0) {
                const rateDateRangeValidation = checkPromoDateDefaultValidations(
                    mealUpgrades,
                    sellFrom,
                    sellTo
                );
                if (rateDateRangeValidation === false) {
                    return sendErrorResponse(
                        res,
                        400,
                        "mealUpgrades should be between contract's validity, toDate should be greater than or equal to fromDate"
                    );
                }
            }

            if (roomDiscounts && roomDiscounts?.length > 0) {
                const rateDateRangeValidation = checkPromoDateDefaultValidations(
                    roomDiscounts,
                    sellFrom,
                    sellTo
                );
                if (rateDateRangeValidation === false) {
                    return sendErrorResponse(
                        res,
                        400,
                        "roomDiscounts should be between contract's validity, toDate should be greater than or equal to fromDate"
                    );
                }
            }

            if (cancellationPolicies && cancellationPolicies?.length > 0) {
                const rateDateRangeValidation = checkPromoDateDefaultValidations(
                    cancellationPolicies,
                    sellFrom,
                    sellTo
                );
                if (rateDateRangeValidation === false) {
                    return sendErrorResponse(
                        res,
                        400,
                        "cancellationPolicies should be between contract's validity, toDate should be greater than or equal to fromDate"
                    );
                }

                for (let policy of cancellationPolicies) {
                    if (
                        policy?.daysBefore &&
                        policy?.daysBefore >= policy?.requestCancelDaysBefore
                    ) {
                        return sendErrorResponse(
                            res,
                            400,
                            "Cancel Booking Before should be less than days before"
                        );
                    }
                }
            }

            const promotion = await HotelPromotion.findOneAndUpdate(
                {
                    _id: id,
                    isDeleted: false,
                },
                {
                    ...req.body,
                    combinedPromotions: isCombinedPromotion === true ? combinePromotionDetail : [],
                    contractGroups: contractGroupsDetails,
                    applicableNations: specificNations === true ? applicableNations : [],
                }
            );
            if (!promotion) {
                return sendErrorResponse(res, 404, "promotion not found");
            }

            res.status(200).json(promotion);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteHotelPromotion: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid promotion id");
            }

            const hotelPromotion = await HotelPromotion.findOneAndUpdate(
                {
                    _id: id,
                    isDeleted: false,
                },
                { isDeleted: true }
            );
            if (!hotelPromotion) {
                return sendErrorResponse(res, 404, "hotel promotion not found");
            }

            res.status(200).json({ message: "hotel promotion deleted successfully", _id: id });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleHotelsPromotions: async (req, res) => {
        try {
            const { hotelId } = req.params;
            const { skip = 0, limit = 10, searchQuery } = req.query;

            const filters = { hotel: Types.ObjectId(hotelId), isDeleted: false };
            if (searchQuery && searchQuery !== "") {
                filters.$or = [
                    { promotionCode: { $regex: searchQuery, $options: "i" } },
                    { name: { $regex: searchQuery, $options: "i" } },
                ];
            }

            if (!isValidObjectId(hotelId)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }
            const hotel = await Hotel.findOne({
                _id: hotelId,
                isActive: true,
                isPublished: true,
                isDeleted: false,
            });
            if (!hotel) {
                return sendErrorResponse(res, 400, "hotel not found");
            }

            const promotions = await HotelPromotion.find(filters)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalPromotions = await HotelPromotion.find(filters).count();

            res.status(200).json({
                promotions,
                totalPromotions,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleHotelPromotion: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid promotion id");
            }

            const hotelPromotion = await HotelPromotion.findOne({ _id: id, isDeleted: false });
            if (!hotelPromotion) {
                return sendErrorResponse(res, 404, "hotel promotion not found");
            }

            res.status(200).json(hotelPromotion);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    cloneHotelPromotion: async (req, res) => {
        try {
            const { promotionId, promotionName, promotionCode, priority } = req.body;

            if (!isValidObjectId(promotionId)) {
                return sendErrorResponse(res, 400, "invalid promotion id");
            }
            const promotion = await HotelPromotion.findOne({ _id: promotionId, isDeleted: false }).lean();
            if (!promotion) {
                return sendErrorResponse(res, 400, "promotion not found");
            }

            const newPromotion = new HotelPromotion({
                ...promotion,
                _id: null,
                promotionCode,
                name: promotionName,
                priority,
            });
            await newPromotion.save();

            res.status(200).json(newPromotion);
        } catch (err) {
            sendErrorResponse(res, 500, err)
        }
    },

    // updatePromotionBannerInfo: async (req, res) => {
    //     try {
    //         const { id } = req.params;
    //         const { showPromoBanner, oldImage } = req.body;

    //         if (!isValidObjectId(id)) {
    //             return sendErrorResponse(res, 400, "invalid hotel promotion id");
    //         }

    //         let bannerImg;
    //         if (req.file?.path) {
    //             bannerImg = "/" + req.file.path.replace(/\\/g, "/");
    //         }

    //         if (showPromoBanner === "true" && !bannerImg && !oldImage) {
    //             return sendErrorResponse(res, 400, "banner image is required");
    //         }

    //         const hotelPromotion = await HotelPromotion.findOneAndUpdate(
    //             {
    //                 _id: id,
    //                 isDeleted: false,
    //             },
    //             {
    //                 showPromoBanner: showPromoBanner || false,
    //                 promoBannerImage: bannerImg ? bannerImg : oldImage,
    //             },
    //             { runValidators: true }
    //         );
    //         if (!hotelPromotion) {
    //             return sendErrorResponse(res, 404, "hotel promotion not found");
    //         }

    //         res.status(200).json({
    //             _id: id,
    //             showPromoBanner: hotelPromotion.showPromoBanner,
    //             promoBannerImage: hotelPromotion.promoBannerImage,
    //         });
    //     } catch (err) {
    //         sendErrorResponse(res, 500, err);
    //     }
    // },

    // getPromotionBannerInfo: async (req, res) => {
    //     try {
    //         const { id } = req.params;

    //         if (!isValidObjectId(id)) {
    //             return sendErrorResponse(res, 400, "invalid hotel promotion id");
    //         }

    //         const hotelPromotion = await HotelPromotion.findOne({
    //             _id: id,
    //             isDeleted: false,
    //         })
    //             .select("showPromoBanner promoBannerImage")
    //             .lean();

    //         if (!hotelPromotion) {
    //             return sendErrorResponse(res, 404, "hotel promotion not found");
    //         }

    //         res.status(200).json(hotelPromotion);
    //     } catch (err) {
    //         sendErrorResponse(res, 500, err);
    //     }
    // },
};
