const { sendErrorResponse } = require("../../../helpers");
const { isValidObjectId, Types } = require("mongoose");
const {
    AttractionActivity,
    VisaType,
    Visa,
    Airline,
    InsurancePlan,
    Transfer,
} = require("../../../models");
const mongoose = require("mongoose");
const {
    B2BSpecialVisaMarkup,
    B2BA2a,
    B2BSpecialA2aMarkup,
    B2BSpecialAttractionMarkup,
    Reseller,
} = require("../../../b2b/models");
const Hotel = require("../../../models/hotel/hotel.model");
const RoomType = require("../../../models/hotel/roomType.model");
const { MarketStrategy, Admin } = require("../../models");
const { HotelBedRoomType } = require("../../../models/hotel");
const OttilaRoomType = require("../../../models/hotel/ottilaRoomType.model");
const B2BHotelProvider = require("../../../b2b/models/hotel/b2bHotelProviders.model");

module.exports = {
    addProfile: async (req, res) => {
        try {
            const { name } = req.body;

            const profile = new MarketStrategy({
                name,
            });

            await profile.save();

            res.status(200).json({
                message: "Created successfully",
                profileId: profile._id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
    getB2bSelectedProfile: async (req, res) => {
        try {
            const { resellerId } = req.params;

            if (!resellerId) {
                return sendErrorResponse(res, 404, "Profile not found");
            }

            const reseller = await Reseller.findOne({ _id: resellerId });

            res.status(200).json({ selectedProfile: reseller?.marketStrategy });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
    getAdminSelectedProfile: async (req, res) => {
        try {
            const { resellerId } = req.params;

            if (!resellerId) {
                return sendErrorResponse(res, 404, "Profile not found");
            }
            console.log(resellerId, "reseller");

            const admin = await Admin.findOne({ _id: resellerId });
            console.log(admin, "admin");
            res.status(200).json({ selectedProfile: admin?.marketStrategy });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    // updateProfile: async (req, res) => {
    //     try {
    //         const { name, category, activities, visa, atoA, hotel, quotation } = req.body;
    //         const { id } = req.params;

    //         if (!isValidObjectId(id)) {
    //             return sendErrorResponse(res, 400, "Invalid profile ID");
    //         }

    //         const profile = await MarketStrategy.findById(id);

    //         if (!profile) {
    //             return sendErrorResponse(res, 404, "Profile not found");
    //         }

    //         if (profile.isDeleted) {
    //             return sendErrorResponse(res, 400, "Profile has been deleted");
    //         }

    //         console.log(hotel, "profile");

    //         profile.name = name || profile.name;
    //         profile.category = category || profile.category;
    //         profile.activities = activities || profile.activities;
    //         profile.visa = visa || profile.visa;
    //         profile.atoA = atoA || profile.atoA;
    //         profile.hotel = hotel || profile.hotel;
    //         profile.quotation = quotation || profile.quotation;

    //         await profile.save();

    //         res.status(200).json({ profile });
    //     } catch (err) {
    //         sendErrorResponse(res, 500, err);
    //     }
    // },

    updateActivityProfile: async (req, res) => {
        try {
            const { activity, markup, markupType, transferMarkup, transferMarkupType } = req.body;

            const { id } = req.params;

            if (!isValidObjectId(activity)) {
                return sendErrorResponse(res, 400, "Invalid Activity id");
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid profile id");
            }

            const existingProfile = await MarketStrategy.findOne({
                _id: id,
                isDeleted: false,
            });

            if (!existingProfile) {
                return sendErrorResponse(res, 404, "Profile not found");
            }

            if (existingProfile) {
                let existingActivityIndex = existingProfile?.activities.findIndex((act) => {
                    return act?.activity?.toString() === activity?.toString();
                });

                if (existingActivityIndex !== -1) {
                    existingProfile.activities[existingActivityIndex].markup = markup;
                    existingProfile.activities[existingActivityIndex].markupType = markupType;
                    existingProfile.activities[existingActivityIndex].transferMarkup =
                        transferMarkup;
                    existingProfile.activities[existingActivityIndex].transferMarkupType =
                        transferMarkupType;
                } else {
                    existingProfile.activities.push({
                        activity,
                        markup,
                        markupType,
                        transferMarkup,
                        transferMarkupType,
                    });
                }
            }

            await existingProfile.save();

            res.status(200).json({ message: "Profile updated" });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    updateVisaProfile: async (req, res) => {
        try {
            const { visa, markup, markupType } = req.body;

            const { id } = req.params;

            if (!isValidObjectId(visa)) {
                return sendErrorResponse(res, 400, "Invalid visa id");
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid profile id");
            }

            const existingProfile = await MarketStrategy.findOne({
                _id: id,
                isDeleted: false,
            });

            if (!existingProfile) {
                return sendErrorResponse(res, 404, "Profile not found");
            }

            if (existingProfile) {
                let existingVisaIndex = existingProfile?.visa.findIndex((vs) => {
                    return vs?.visa?.toString() === visa?.toString();
                });

                if (existingVisaIndex !== -1) {
                    existingProfile.visa[existingVisaIndex].markup = markup;
                    existingProfile.visa[existingVisaIndex].markupType = markupType;
                } else {
                    existingProfile.visa.push({
                        visa,
                        markup,
                        markupType,
                    });
                }
            }

            await existingProfile.save();

            res.status(200).json({ message: "Profile updated" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateA2aProfile: async (req, res) => {
        try {
            const { atoa, markup, markupType } = req.body;

            const { id } = req.params;

            if (!isValidObjectId(atoa)) {
                return sendErrorResponse(res, 400, "Invalid visa id");
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid profile id");
            }

            const existingProfile = await MarketStrategy.findOne({
                _id: id,
                isDeleted: false,
            });

            if (!existingProfile) {
                return sendErrorResponse(res, 404, "Profile not found");
            }

            if (existingProfile) {
                let existingA2aIndex = existingProfile?.atoA.findIndex((a2a) => {
                    return a2a?.atoa?.toString() === atoa?.toString();
                });

                if (existingA2aIndex !== -1) {
                    existingProfile.atoA[existingA2aIndex].markup = markup;
                    existingProfile.atoA[existingA2aIndex].markupType = markupType;
                } else {
                    existingProfile.atoA.push({
                        atoa,
                        markup,
                        markupType,
                    });
                }
            }

            await existingProfile.save();

            res.status(200).json({ message: "Profile updated" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateStarCategory: async (req, res) => {
        try {
            const { name, markup, markupType, markupApi, markupTypeApi, providers } = req.body;

            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid profile id");
            }

            const validProviders = new Set(["HotelBeds", "Ottila", "Contract"]);

            const isValid = providers.every((provider) => validProviders.has(provider));

            if (!isValid) {
                return sendErrorResponse(res, 400, "Invalid provider");
            }

            const providerDetailsArr = await B2BHotelProvider.find({
                name: providers,
                isDeleted: false,
                isActive: true,
            });

            const existingProfile = await MarketStrategy.findOne({
                _id: id,
                isDeleted: false,
            });

            if (!existingProfile) {
                return sendErrorResponse(res, 404, "Profile not found");
            }

            if (existingProfile) {
                let existingStarCategoryIndex = existingProfile?.starCategory.findIndex(
                    (starCat) => {
                        return starCat?.name?.toString() === name?.toString();
                    }
                );

                const promises = providerDetailsArr.map((provider) => {
                    let isUpdated = false;
                    if (existingStarCategoryIndex !== -1) {
                        existingProfile.starCategory[existingStarCategoryIndex]?.markups?.forEach(
                            (markupDoc, idx) => {
                                if (
                                    markupDoc?.hotelProviderId?.toString() ===
                                    provider?._id?.toString()
                                ) {
                                    existingProfile.starCategory[existingStarCategoryIndex].markups[
                                        idx
                                    ].markup = markup;
                                    existingProfile.starCategory[existingStarCategoryIndex].markups[
                                        idx
                                    ].markupType = markupType;
                                }
                            }
                        );

                        if (!isUpdated) {
                            existingProfile.starCategory[existingStarCategoryIndex]?.markups.push({
                                hotelProviderId: provider?._id,
                                markup,
                                markupType,
                            });
                        }
                    } else {
                        existingProfile.starCategory.push({
                            name,
                            markups: [
                                {
                                    hotelProviderId: provider?._id,
                                    markup,
                                    markupType,
                                },
                            ],
                        });
                    }
                });

                await Promise.all(promises);
                await existingProfile.save();
            }

            res.status(200).json({ message: "Profile updated" });
        } catch (err) {
            console.log(err, "error updating");
            sendErrorResponse(res, 500, err);
        }
    },
    updateHotelRoomType: async (req, res) => {
        try {
            const { hotelId, markup, markupType, markupApi, markupTypeApi, providers } = req.body;

            const { id } = req.params;

            const validProviders = new Set(["HotelBeds", "Ottila", "Contract"]);

            const isValid = providers.every((provider) => validProviders.has(provider));

            if (!isValid) {
                return sendErrorResponse(res, 400, "Invalid provider");
            }

            const providerDetailsArr = await B2BHotelProvider.find({
                name: providers,
                isDeleted: false,
                isActive: true,
            });

            const existingProfile = await MarkupProfile.findOne({
                _id: id,
                isDeleted: false,
            });

            if (!existingProfile) {
                return sendErrorResponse(res, 404, "Profile not found");
            }

            const promises = providers.map(async (provider) => {
                let RoomTypeModel;

                switch (provider) {
                    case "HotelBeds":
                        RoomTypeModel = HotelBedRoomType;
                        break;
                    case "Ottila":
                        RoomTypeModel = OttilaRoomType;
                        break;
                    case "Contract":
                        RoomTypeModel = RoomType;
                        break;

                    default:
                        RoomTypeModel = RoomType;
                        break;
                }

                const roomTypes = await RoomType.find({ hotel: hotelId });

                const providerDetails = providerDetailsArr.find((p) => p.name === provider);

                if (existingProfile && providerDetails) {
                    let existingHotelIndex = existingProfile?.hotel.findIndex((hot) => {
                        return hot?.hotelId?.toString() === hotelId?.toString();
                    });

                    console.log(existingHotelIndex, "existingHotelIndex");

                    for (let i = 0; i < roomTypes.length; i++) {
                        let roomType = roomTypes[i];
                        if (existingHotelIndex !== -1) {
                            let existingRoomTypeIndex = existingProfile.hotel[
                                existingHotelIndex
                            ].roomTypes.findIndex((rm) => {
                                return (
                                    rm?.roomTypeId?.toString() === roomType?._id?.toString() &&
                                    rm?.hotelProviderId?.toString() ===
                                        providerDetails?._id?.toString()
                                );
                            });
                            console.log(existingRoomTypeIndex, "existingRoomTypeIndex");

                            if (existingRoomTypeIndex !== -1) {
                                console.log(existingRoomTypeIndex, "existingRoomTypeIndex 22");

                                existingProfile.hotel[existingHotelIndex].roomTypes[
                                    existingRoomTypeIndex
                                ].markup = markup;
                            } else {
                                console.log(existingRoomTypeIndex, "existingRoomTypeIndex 33");

                                existingProfile.hotel[existingHotelIndex].roomTypes.push({
                                    hotelProviderId: providerDetails?._id,
                                    roomTypeId: roomType?._id,
                                    markup,
                                    markupType,
                                });
                            }
                        } else {
                            const newHotelData = {
                                hotelId,
                                roomTypes: [
                                    {
                                        hotelProviderId: providerDetails?._id,
                                        roomTypeId: roomType?._id,
                                        markup,
                                        markupType,
                                    },
                                ],
                            };

                            console.log("existingRoomTypeIndex 555");

                            // Assuming `hotel` is a field within your document
                            existingProfile.hotel.push(newHotelData);
                        }
                    }
                }
            });

            await Promise.all(promises);

            await existingProfile.save();

            res.status(200).json({ message: "Profile updated" });
        } catch (err) {
            console.log(err, "error updating");
            sendErrorResponse(res, 500, err);
        }
    },

    updateHotelMarkup: async (req, res) => {
        const { hotelId, markup, markupType, providerId } = req.body;

        const { id } = req.params;

        if (!isValidObjectId(id)) {
            return sendErrorResponse(res, 400, "Invalid profile id");
        }

        if (!isValidObjectId(hotelId)) {
            return sendErrorResponse(res, 400, "Invalid hotel id");
        }

        if (!isValidObjectId(providerId)) {
            return sendErrorResponse(res, 400, "Invalid provider id");
        }

        const providerDetails = await B2BHotelProvider.findOne({
            _id: providerId,
            isDeleted: false,
            isActive: true,
        });

        if (!providerDetails) {
            return sendErrorResponse(res, 404, "Provider not found");
        }

        const existingProfile = await MarketStrategy.findOne({
            _id: id,
            isDeleted: false,
        });

        if (!existingProfile) {
            return sendErrorResponse(res, 404, "Profile not found");
        }
        try {
            let existingHotelIndex = existingProfile?.hotel.findIndex((hot) => {
                return hot?.hotelId?.toString() === hotelId?.toString();
            });

            if (existingHotelIndex !== -1) {
                const existingMarkupIndex = existingProfile.hotel[
                    existingHotelIndex
                ]?.hotelMarkup?.findIndex(
                    (markupDoc) => markupDoc.hotelProviderId.toString() === providerId.toString()
                );

                if (existingMarkupIndex !== -1) {
                    existingProfile.hotel[existingHotelIndex].hotelMarkup[
                        existingMarkupIndex
                    ].markup = markup;
                    existingProfile.hotel[existingHotelIndex].hotelMarkup[
                        existingMarkupIndex
                    ].markupType = markupType;
                } else {
                    existingProfile.hotel[existingHotelIndex].hotelMarkup.push({
                        hotelProviderId: providerId,
                        markup,
                        markupType,
                    });
                }
            } else {
                existingProfile.hotel.push({
                    hotelId,
                    hotelMarkup: [
                        {
                            hotelProviderId: providerId,
                            markup,
                            markupType,
                        },
                    ],
                });
            }

            await existingProfile.save();
            res.status(200).json({ message: "Profile updated" });
        } catch (err) {
            console.log(err, "error updating");
            sendErrorResponse(res, 500, err);
        }
    },

    updateRoomType: async (req, res) => {
        try {
            const { hotelId, roomTypeId, markup, markupType, markupApi, markupTypeApi, provider } =
                req.body;

            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid profile id");
            }

            const providers = ["HotelBeds", "Ottila", "Contract"];

            if (!providers.includes(provider)) {
                return sendErrorResponse(res, 400, "Invalid provider");
            }

            let RoomTypeModel;

            switch (provider) {
                case "HotelBeds":
                    RoomTypeModel = HotelBedRoomType;
                    break;
                case "Ottila":
                    RoomTypeModel = OttilaRoomType;
                    break;
                case "Contract":
                    RoomTypeModel = RoomType;
                    break;

                default:
                    RoomTypeModel = RoomType;
                    break;
            }

            const providerDetails = await B2BHotelProvider.findOne({
                name: provider,
                isDeleted: false,
                isActive: true,
            });

            const existingProfile = await MarketStrategy.findOne({
                _id: id,
                isDeleted: false,
            });

            if (!existingProfile) {
                return sendErrorResponse(res, 404, "Profile not found");
            }

            if (existingProfile) {
                let existingHotelIndex = existingProfile?.hotel.findIndex((hot) => {
                    return hot?.hotelId?.toString() === hotelId?.toString();
                });

                if (existingHotelIndex !== -1) {
                    let existingRoomTypeIndex = existingProfile?.hotel[
                        existingHotelIndex
                    ]?.roomTypes?.findIndex((roomType) => {
                        return (
                            roomType?.roomTypeId?.toString() === roomTypeId?.toString() &&
                            roomType?.hotelProviderId?.toString() ===
                                providerDetails?._id?.toString()
                        );
                    });

                    if (existingRoomTypeIndex !== -1) {
                        existingProfile.hotel[existingHotelIndex].roomTypes[
                            existingRoomTypeIndex
                        ].markup = markup;
                        existingProfile.hotel[existingHotelIndex].roomTypes[
                            existingRoomTypeIndex
                        ].markupType = markupType;
                    } else {
                        existingProfile.hotel[existingHotelIndex].roomTypes.push({
                            hotelProviderId: providerDetails?._id,
                            roomTypeId,
                            markup,
                            markupType,
                        });
                    }
                } else {
                    const newHotelData = {
                        hotelId,
                        roomTypes: [
                            {
                                hotelProviderId: providerDetails?._id,
                                roomTypeId,
                                markup,
                                markupType,
                            },
                        ],
                    };

                    // Assuming `hotel` is a field within your document
                    existingProfile.hotel.push(newHotelData);
                }
            }

            await existingProfile.save();

            res.status(200).json({ message: "Profile updated" });
        } catch (err) {
            console.log(err, "error updating");
            sendErrorResponse(res, 500, err);
        }
    },

    updateQuotation: async (req, res) => {
        try {
            const {
                hotelMarkupType,
                hotelMarkup,
                landmarkMarkupType,
                landmarkMarkup,
                visaMarkupType,
                visaMarkup,
            } = req.body;

            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid profile id");
            }

            const existingProfile = await MarketStrategy.findOneAndUpdate(
                {
                    _id: id,
                    isDeleted: false,
                },
                {
                    quotation: {
                        hotelMarkupType,
                        hotelMarkup,
                        landmarkMarkupType,
                        landmarkMarkup,
                        visaMarkupType,
                        visaMarkup,
                    },
                },
                {
                    new: true, // To return the updated document
                }
            );

            await existingProfile.save();
            res.status(200).json({ message: "Profile updated" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateFlightProfile: async (req, res) => {
        try {
            const { airlineCode, markup, markupType } = req.body;

            const { id } = req.params;

            // if (!isValidObjectId(airlineId)) {
            //     return sendErrorResponse(res, 400, "Invalid airlineId");
            // }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid profile id");
            }

            const existingProfile = await MarketStrategy.findOne({
                _id: id,
                isDeleted: false,
            });

            if (!existingProfile) {
                return sendErrorResponse(res, 404, "Profile not found");
            }

            if (existingProfile) {
                let existingFlightIndex = existingProfile?.flight.findIndex((fgt) => {
                    return fgt?.airlineCode?.toString() === airlineCode?.toString();
                });

                if (existingFlightIndex !== -1) {
                    existingProfile.flight[existingFlightIndex].markup = markup;
                    existingProfile.flight[existingFlightIndex].markupType = markupType;
                } else {
                    existingProfile.flight.push({
                        airlineCode,
                        markup,
                        markupType,
                    });
                }
            }

            await existingProfile.save();

            res.status(200).json({ message: "Profile updated" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateInsuranceProfile: async (req, res) => {
        try {
            const { insuranceId, markup, markupType } = req.body;

            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid profile id");
            }

            const existingProfile = await MarketStrategy.findOne({
                _id: id,
                isDeleted: false,
            });

            if (!existingProfile) {
                return sendErrorResponse(res, 404, "Profile not found");
            }

            if (existingProfile) {
                let existingInsurnanceIndex = existingProfile?.insurance.findIndex((ins) => {
                    return ins?.insuranceId?.toString() === insuranceId?.toString();
                });

                if (existingInsurnanceIndex !== -1) {
                    existingProfile.insurance[existingInsurnanceIndex].markup = markup;
                    existingProfile.insurance[existingInsurnanceIndex].markupType = markupType;
                } else {
                    existingProfile.insurance.push({
                        insuranceId,
                        markup,
                        markupType,
                    });
                }
            }

            await existingProfile.save();

            res.status(200).json({ message: "Profile updated" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateTransferProfile: async (req, res) => {
        try {
            const { transferId, vehicleId, markup, markupType } = req.body;

            const { id } = req.params;

            // if (!isValidObjectId(airlineId)) {
            //     return sendErrorResponse(res, 400, "Invalid airlineId");
            // }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid profile id");
            }

            const existingProfile = await MarketStrategy.findOne({
                _id: id,
                isDeleted: false,
            });

            if (!existingProfile) {
                return sendErrorResponse(res, 404, "Profile not found");
            }

            if (existingProfile) {
                let existingTransfertIndex = existingProfile?.transfer.findIndex((fgt) => {
                    return fgt?.transferId?.toString() === transferId?.toString();
                });

                if (existingTransfertIndex !== -1) {
                    const vehicleIndex = existingProfile?.transfer[
                        existingTransfertIndex
                    ]?.vehicleType?.findIndex(
                        (a) => a?.vehicleId?.toString() === vehicleId?.toString()
                    );

                    if (vehicleIndex !== -1) {
                        existingProfile.transfer[existingTransfertIndex].vehicleType[
                            vehicleIndex
                        ].markup = markup;
                        existingProfile.transfer[existingTransfertIndex].vehicleType[
                            vehicleIndex
                        ].markupType = markupType;
                    } else {
                        existingProfile.transfer[existingTransfertIndex].vehicleType.push({
                            vehicleId,
                            markup,
                            markupType,
                        });
                    }
                } else {
                    existingProfile.transfer.push({
                        transferId,
                        vehicleType: [{ vehicleId, markup, markupType }],
                    });
                }
            }

            await existingProfile.save();

            res.status(200).json({ message: "Profile updated" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateAttractionProfile: async (req, res) => {
        try {
            const { markup, markupType } = req.body;

            const { id } = req.params;

            // if (!isValidObjectId(airlineId)) {
            //     return sendErrorResponse(res, 400, "Invalid airlineId");
            // }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid profile id");
            }

            const activities = await AttractionActivity.aggregate([
                {
                    $match: {
                        isDeleted: false,
                    },
                },
                {
                    $lookup: {
                        from: "attractions", // Corrected collection name
                        localField: "attraction",
                        foreignField: "_id",
                        as: "attraction",
                    },
                },
                {
                    $set: {
                        attraction: { $arrayElemAt: ["$attraction", 0] },
                    },
                },
                {
                    $match: {
                        "attraction.isDeleted": false,
                    },
                },
                {
                    $project: {
                        name: 1,
                    },
                },
            ]);

            const existingProfile = await MarketStrategy.findOne({
                _id: id,
                isDeleted: false,
            });

            if (!existingProfile) {
                return sendErrorResponse(res, 404, "Profile not found");
            }

            activities.forEach(async (activity) => {
                const existingActivityIndex = existingProfile.activities.findIndex((act) => {
                    return act.activity.toString() === activity._id.toString();
                });

                if (existingActivityIndex !== -1) {
                    existingProfile.activities[existingActivityIndex].markup = markup;
                    existingProfile.activities[existingActivityIndex].markupType = markupType;
                } else {
                    existingProfile.activities.push({
                        activity: activity._id,
                        markup,
                        markupType,
                    });
                }
            });

            await existingProfile.save();

            res.status(200).json({ message: "Profile updated" });
        } catch (err) {
            console.log(err, "err");
            sendErrorResponse(res, 500, err);
        }
    },

    updateSingleTransferProfile: async (req, res) => {
        try {
            const { transferId, markup, markupType } = req.body;

            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid profile id");
            }

            const transfer = await Transfer.findOne({ _id: transferId, isDeleted: false });
            if (!transfer) {
                return sendErrorResponse(res, 404, "Transfers not found");
            }

            const existingProfile = await MarketStrategy.findOne({
                _id: id,
                isDeleted: false,
            });

            if (!existingProfile) {
                return sendErrorResponse(res, 404, "Profile not found");
            }

            transfer?.vehicleType?.forEach((vehTy) => {
                const existingTransferIndex = existingProfile.transfer?.findIndex((tf) => {
                    return tf.transferId.toString() === transferId.toString();
                });

                if (existingTransferIndex !== -1) {
                    const vehicleIndex = existingProfile?.transfer[
                        existingTransferIndex
                    ]?.vehicleType?.findIndex(
                        (a) => a?.vehicleId?.toString() === vehTy?.vehicle?.toString()
                    );

                    if (vehicleIndex !== -1) {
                        existingProfile.transfer[existingTransferIndex].vehicleType[
                            vehicleIndex
                        ].markup = markup;
                        existingProfile.transfer[existingTransferIndex].vehicleType[
                            vehicleIndex
                        ].markupType = markupType;
                    } else {
                        existingProfile.transfer[existingTransferIndex].vehicleType.push({
                            markup,
                            markupType,
                            vehicleId: vehTy.vehicle,
                        });
                    }
                } else {
                    existingProfile.transfer.push({
                        transferId: transferId,
                        vehicleType: [
                            {
                                vehicleId: vehTy.vehicle,
                                markup,
                                markupType,
                            },
                        ],
                    });
                }
            });

            await existingProfile.save();

            res.status(200).json({ message: "transfer profile updated" });
        } catch (err) {
            console.log(err, "err");
            sendErrorResponse(res, 500, err);
        }
    },

    updateAllTransferProfile: async (req, res) => {
        try {
            const { transferId, markup, markupType } = req.body;

            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid profile id");
            }

            const transfers = await Transfer.find({ isDeleted: false });
            if (!transfers) {
                return sendErrorResponse(res, 404, "Transfers not found");
            }

            const existingProfile = await MarketStrategy.findOne({
                _id: id,
                isDeleted: false,
            });

            if (!existingProfile) {
                return sendErrorResponse(res, 404, "Profile not found");
            }

            console.log(transfers, "transfer");

            transfers.forEach((transfer) => {
                transfer?.vehicleType?.forEach((vehTy) => {
                    const existingTransferIndex = existingProfile.transfer?.findIndex((tf) => {
                        return tf?.transferId?.toString() === transfer?._id?.toString();
                    });

                    console.log(existingTransferIndex, "existingTransferIndex");

                    if (existingTransferIndex !== -1) {
                        const vehicleIndex = existingProfile?.transfer[
                            existingTransferIndex
                        ]?.vehicleType?.findIndex(
                            (a) => a?.vehicleId?.toString() === vehTy?.vehicle?.toString()
                        );

                        if (vehicleIndex !== -1) {
                            existingProfile.transfer[existingTransferIndex].vehicleType[
                                vehicleIndex
                            ].markup = markup;
                            existingProfile.transfer[existingTransferIndex].vehicleType[
                                vehicleIndex
                            ].markupType = markupType;
                        } else {
                            existingProfile.transfer[existingTransferIndex].vehicleType.push({
                                markup,
                                markupType,
                                vehicleId: vehTy.vehicle,
                            });
                        }
                    } else {
                        existingProfile.transfer.push({
                            transferId: transfer?._id,
                            vehicleType: [
                                {
                                    vehicleId: vehTy.vehicle,
                                    markup,
                                    markupType,
                                },
                            ],
                        });
                    }
                });
            });

            console.log(existingProfile.transfer, "trnasferssss");

            await existingProfile.save();

            res.status(200).json({ message: "transfer profile updated" });
        } catch (err) {
            console.log(err, "err");
            sendErrorResponse(res, 500, err);
        }
    },

    deleteProfile: async (req, res) => {
        try {
            const { id } = req.params;

            const profile = await MarketStrategy.findByIdAndUpdate(id, { isDeleted: true });

            if (!profile) {
                return sendErrorResponse(res, 404, "Profile not found");
            }

            res.json({ message: "Profile deleted successfully" });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    getAllProfiles: async (req, res) => {
        try {
            const profiles = await MarketStrategy.find({ isDeleted: false }).select("name");
            if (!profiles) {
                return sendErrorResponse(res, 400, "Profile not found");
            }
            res.status(200).json(profiles);
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    getAllAttractionActivities: async (req, res) => {
        try {
            // const activities = await AttractionActivity.aggregate([
            //     {
            //         $match: { isDeleted: false },
            //     },
            //     {
            //         $lookup: {
            //             from: "attractions",
            //             localField: "attraction",
            //             foreignField: "_id",
            //             as: "attraction",
            //         },
            //     },
            //     {
            //         $unwind: "$attraction",
            //     },
            //     {
            //         $match: { "attraction.isDeleted": false },
            //     },
            //     {
            //         $group: {
            //             _id: "$attraction._id",
            //             name: { $first: "$attraction.title" },
            //             activities: {
            //                 $push: {
            //                     _id: "$_id",
            //                     name: "$name",
            //                     activityType: "$activityType",
            //                 },
            //             },
            //         },
            //     },
            // ]);
            const { profileId } = req.params;

            if (!isValidObjectId(profileId)) {
                return sendErrorResponse(res, 400, "Invalid profileId ");
            }

            const profile = await MarketStrategy.findOne({ _id: profileId });

            const activities = await AttractionActivity.find({ isDeleted: false }).populate(
                "attraction"
            );

            const attractionList = [];

            activities?.forEach((activity) => {
                if (!activity?.attraction?.isDeleted) {
                    const attraction = activity?.attraction;
                    const existingAttraction = attractionList?.find(
                        (a) => a?._id === attraction?._id
                    );

                    const act = profile?.activities?.find(
                        (a) => a?.activity?.toString() === activity?._id?.toString()
                    );

                    const { _id, name, activityType } = activity;

                    if (existingAttraction) {
                        existingAttraction.activities.push({
                            _id: _id,
                            markup: act?.markup || 0,
                            markupType: act?.markupType || "flat",
                            transferMarkup: act?.transferMarkup || 0,
                            transferMarkupType: act?.transferMarkupType || "flat",
                            name: name,
                            activityType: activityType,
                        });
                    } else {
                        const newAttraction = {
                            _id: attraction?._id,
                            name: attraction?.title,
                            activities: [
                                {
                                    _id,
                                    markup: act?.markup || 0,
                                    markupType: act?.markupType || "flat",
                                    transferMarkup: act?.transferMarkup || 0,
                                    transferMarkupType: act?.transferMarkupType || "flat",
                                    name,
                                    activityType,
                                },
                            ],
                        };
                        attractionList.push(newAttraction);
                    }
                }
            });

            res.status(200).json({ name: profile.name, attraction: attractionList });
        } catch (err) {
            console.error(err);
            sendErrorResponse(res, 500, err);
        }
    },

    getAllVisaType: async (req, res) => {
        try {
            const { profileId } = req.params;

            if (!isValidObjectId(profileId)) {
                return sendErrorResponse(res, 400, "Invalid profileId ");
            }

            let visa = await VisaType.find({ isDeleted: false }).populate("visa");

            const profile = await MarketStrategy.findOne({ isDeleted: false, _id: profileId });

            const visaList = [];
            visa.forEach((visa) => {
                const visaMarkup = profile.visa.find(
                    (a) => a.visa.toString() === visa._id.toString()
                );

                visaList.push({
                    _id: visa._id,
                    visaName: visa.visaName,
                    markupType: visaMarkup?.markupType || "flat",
                    markup: visaMarkup?.markup || 0,
                    visa: {
                        name: visa.visa.name,
                    },
                });
            });

            res.status(200).json(visaList);
        } catch (error) {
            console.log(error);
            sendErrorResponse(res, 500, error);
        }
    },

    getAlla2aTypes: async (req, res) => {
        try {
            const { profileId } = req.params;

            if (!isValidObjectId(profileId)) {
                return sendErrorResponse(res, 400, "Invalid profileId ");
            }
            let a2a = await B2BA2a.find({ isDeleted: false })
                .populate("airportFrom")
                .populate("airportTo");

            const profile = await MarketStrategy.findOne({ isDeleted: false, _id: profileId });

            const a2aTypeList = [];

            a2a.forEach((atoA) => {
                const a2aMarkup = profile.atoA.find(
                    (a) => a.atoa.toString() === atoA._id.toString()
                );

                a2aTypeList.push({
                    _id: atoA._id,
                    markupType: a2aMarkup?.markupType || "flat",
                    markup: a2aMarkup?.markup || 0,
                    airportFrom: {
                        airportName: atoA.airportFrom.airportName,
                        iataCode: atoA.airportFrom.iataCode,
                    },
                    airportTo: {
                        airportName: atoA.airportTo.airportName,
                        iataCode: atoA.airportTo.iataCode,
                    },
                });
            });

            res.status(200).json(a2aTypeList);
        } catch (error) {
            console.log(error);
            sendErrorResponse(res, 500, error);
        }
    },

    getAllCategory: async (req, res) => {
        try {
            const { profileId, provider } = req.params;

            if (!isValidObjectId(profileId)) {
                return sendErrorResponse(res, 400, "Invalid profileId ");
            }

            const providers = ["HotelBeds", "Ottila", "Contract"];

            if (!providers.includes(provider)) {
                return sendErrorResponse(res, 400, "Invalid provider");
            }

            const providerDetails = await B2BHotelProvider.findOne({
                name: provider,
                isDeleted: false,
                isActive: true,
            });

            if (!providerDetails) {
                return sendErrorResponse(res, 400, "Provider details not found");
            }

            const categories = ["1", "2", "3", "4", "5", "appartment"];

            const profile = await MarketStrategy.findOne({ _id: profileId, isDeleted: false });

            const categoryList = {
                Contract: [],
                HotelBeds: [],
                Ottila: [],
            };

            for (const category of categories) {
                const categoryMarkup = profile?.starCategory?.find((starCate) => {
                    return starCate?.name?.toString() === category?.toString();
                });

                if (!categoryMarkup || !categoryMarkup?.markups.length) {
                    categoryList[providerDetails?.name]?.push({
                        markupType: "flat",
                        markup: 0,
                        name: category,
                    });
                    continue;
                }

                const matched = false;
                categoryMarkup?.markups?.forEach((markupDoc) => {
                    if (
                        markupDoc?.hotelProviderId?.toString() === providerDetails?._id?.toString()
                    ) {
                        categoryList[providerDetails?.name]?.push({
                            markupType: markupDoc?.markupType || "flat",
                            markup: markupDoc?.markup || 0,
                            // markupTypeApi: categoryMarkup?.markupTypeApi || "flat",
                            // markupApi: categoryMarkup?.markupApi || 0,
                            name: category,
                        });
                        matched = true;
                    }
                });

                if (!matched) {
                    categoryList[providerDetails?.name]?.push({
                        markupType: "flat",
                        markup: 0,
                        name: category,
                    });
                }

                // categoryList.push({
                //     markupType: categoryMarkup?.markupType || "flat",
                //     markup: categoryMarkup?.markup || 0,
                //     markupTypeApi: categoryMarkup?.markupTypeApi || "flat",
                //     markupApi: categoryMarkup?.markupApi || 0,
                //     name: category,
                // });
            }

            res.status(200).json(categoryList);
        } catch (error) {
            sendErrorResponse(res, 500, error);
        }
    },

    getAllHotels: async (req, res) => {
        try {
            const { skip = 0, limit = 10, searchInput } = req.query;

            let filters1 = { isDeleted: false };
            if (searchInput && searchInput !== "") {
                filters1.hotelName = { $regex: searchInput, $options: "i" };
            }

            const hotels = await Hotel.find(filters1)
                .select("hotelName")
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const total = await Hotel.find(filters1).count();

            res.status(200).json({ hotels, total, skip: Number(skip), limit: Number(limit) });
        } catch (error) {
            sendErrorResponse(res, 500, error);
        }
    },

    getAllRoomTypes: async (req, res) => {
        try {
            const { profileId, hotelId, provider } = req.params;

            if (!isValidObjectId(profileId)) {
                return sendErrorResponse(res, 400, "Invalid profileId ");
            }

            if (!isValidObjectId(hotelId)) {
                return sendErrorResponse(res, 400, "Invalid hotelId ");
            }

            const providers = ["HotelBeds", "Ottila", "Contract"];

            if (!providers.includes(provider)) {
                return sendErrorResponse(res, 400, "Invalid provider");
            }

            let RoomTypeModel;

            switch (provider) {
                case "HotelBeds":
                    RoomTypeModel = HotelBedRoomType;
                    break;
                case "Ottila":
                    RoomTypeModel = OttilaRoomType;
                    break;
                case "Contract":
                    RoomTypeModel = RoomType;
                    break;

                default:
                    RoomTypeModel = RoomType;
                    break;
            }

            const providerDetails = await B2BHotelProvider.findOne({
                name: provider,
                isDeleted: false,
                isActive: true,
            });

            const roomTypes = await RoomTypeModel.find({ isDeleted: false, hotel: hotelId });

            const profile = await MarketStrategy.findOne({ isDeleted: false, _id: profileId });

            const roomTypeList = [];

            roomTypes.forEach((roomType) => {
                const hotel = profile?.hotel?.find(
                    (a) => a?.hotelId?.toString() === roomType?.hotel?.toString()
                );

                if (hotel) {
                    const selectedRoomType = hotel?.roomTypes?.find(
                        (a) =>
                            a?.roomTypeId?.toString() === roomType?._id?.toString() &&
                            a?.hotelProviderId?.toString() === providerDetails._id.toString()
                    );

                    if (selectedRoomType) {
                        roomTypeList.push({
                            roomName: roomType?.roomName,

                            roomTypeId: roomType?._id,
                            hotelId: roomType?.hotel,
                            markupType: selectedRoomType.markupType || "flat",
                            markup: selectedRoomType.markup || 0,
                        });
                    } else {
                        roomTypeList.push({
                            roomName: roomType?.roomName,

                            roomTypeId: roomType?._id,
                            hotelId: roomType?.hotel,
                            markupType: "flat",
                            markup: 0,
                        });
                    }
                } else {
                    roomTypeList.push({
                        roomName: roomType?.roomName,

                        roomTypeId: roomType?._id,
                        hotelId: roomType?.hotel,
                        markupType: "flat",
                        markup: 0,
                    });
                }
            });

            res.status(200).json(roomTypeList);
        } catch (err) {
            console.error(err);

            sendErrorResponse(res, 500, err);
        }
    },

    getHotelMarkups: async (req, res) => {
        const { profileId, hotelId } = req.params;

        if (!isValidObjectId(profileId)) {
            return sendErrorResponse(res, 400, "Invalid profileId ");
        }

        if (!isValidObjectId(hotelId)) {
            return sendErrorResponse(res, 400, "Invalid hotelId ");
        }

        const profile = await MarketStrategy.findOne({ isDeleted: false, _id: profileId });

        if (!profile) {
            return sendErrorResponse(res, 404, "Profile not found ");
        }

        const providerDetails = await B2BHotelProvider.find({
            isDeleted: false,
            isActive: true,
        }).select("_id name");

        if (!providerDetails || !providerDetails.length) {
            return sendErrorResponse(res, 404, "Providers not found ");
        }

        const hotel = profile?.hotel?.find((a) => a?.hotelId?.toString() === hotelId?.toString());

        const hotelMarkupList = [];

        providerDetails.forEach((item) => {
            if (hotel && hotel.hotelMarkup) {
                let matched = false;
                hotel?.hotelMarkup?.forEach((markupDoc) => {
                    const markup = {
                        markup: markupDoc.markup,
                        markupType: markupDoc.markupType,
                    };

                    if (markupDoc?.hotelProviderId?.toString() === item._id?.toString()) {
                        hotelMarkupList.push({
                            ...item?._doc,
                            markupDetails: markup,
                        });
                        matched = true;
                    }
                });

                if (!matched) {
                    hotelMarkupList.push({
                        ...item?._doc,
                        markupDetails: {
                            markup: 0,
                            markupType: "flat",
                        },
                    });
                }
            } else {
                hotelMarkupList.push({
                    ...item?._doc,
                    markupDetails: {
                        markup: 0,
                        markupType: "flat",
                    },
                });
            }
        });

        res.status(200).json(hotelMarkupList);
    },

    getQuotationDetails: async (req, res) => {
        try {
            const { profileId } = req.params;

            if (!isValidObjectId(profileId)) {
                return sendErrorResponse(res, 400, "Invalid profileId ");
            }
            const profile = await MarketStrategy.findOne({ isDeleted: false, _id: profileId });

            const quotation = {
                hotelMarkupType: profile?.quotation?.hotelMarkupType || "flat",
                hotelMarkup: profile?.quotation?.hotelMarkup || 0,
                landmarkMarkupType: profile?.quotation?.landmarkMarkupType || "flat",
                landmarkMarkup: profile?.quotation?.landmarkMarkup || 0,
                visaMarkupType: profile?.quotation?.visaMarkupType || "flat",
                visaMarkup: profile?.quotation?.visaMarkup || 0,
            };
            res.status(200).json(quotation);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllAirlines: async (req, res) => {
        try {
            const { profileId } = req.params;

            if (!isValidObjectId(profileId)) {
                return sendErrorResponse(res, 400, "Invalid profileId ");
            }

            let airlines = await Airline.find({ isDeleted: false });

            const profile = await MarketStrategy.findOne({ isDeleted: false, _id: profileId });

            const airlineList = [];
            airlines.forEach((airline) => {
                const airlineMarkup = profile?.flight?.find(
                    (a) => a?.airlineCode?.toString() === airline?.airlineCode?.toString()
                );

                airlineList.push({
                    airlineCode: airline?.airlineCode,
                    airlineName: airline?.airlineName,
                    markupType: airlineMarkup?.markupType || "flat",
                    markup: airlineMarkup?.markup || 0,
                });
            });

            res.status(200).json(airlineList);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllInsurancePlans: async (req, res) => {
        try {
            const { profileId } = req.params;

            if (!isValidObjectId(profileId)) {
                return sendErrorResponse(res, 400, "Invalid profileId ");
            }

            let insurances = await InsurancePlan.find({ isDeleted: false });

            const profile = await MarketStrategy.findOne({ isDeleted: false, _id: profileId });

            const insuranceList = [];
            insurances.forEach((insurance) => {
                const insuranceMarkup = profile?.insurance?.find(
                    (a) => a?.insuranceId?.toString() === insurance?.insuranceId?.toString()
                );

                insuranceList.push({
                    insuranceId: insurance?.insuranceId,
                    planName: insurance?.name,
                    markupType: insuranceMarkup?.markupType || "flat",
                    markup: insuranceMarkup?.markup || 0,
                });
            });

            res.status(200).json(insuranceList);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllTransfers: async (req, res) => {
        try {
            const { profileId } = req.params;
            const { skip = 0, limit = 10, transferFrom, transferTo, transferType } = req.query;

            if (!isValidObjectId(profileId)) {
                return sendErrorResponse(res, 400, "Invalid profileId ");
            }

            let filters1 = {};

            if (transferType && transferType !== "" && transferType !== "area-area") {
                if (transferTo && transferTo !== "") {
                    filters1.transferTo = Types.ObjectId(transferTo);
                }

                if (transferFrom && transferFrom !== "") {
                    filters1.transferFrom = Types.ObjectId(transferFrom);
                }

                filters1.transferType = transferType;
            }

            // let filters2 = {};

            // if (transferTo && transferTo !== "" && transferType === "area-area") {
            //     if (transferTo && transferTo !== "") {
            //         filters2["tansferFromDetails.areas"] = Types.ObjectId(transferTo);
            //     }

            //     if (transferFrom && transferFrom !== "") {
            //         filters2["tansferToDetails.areas"] = Types.ObjectId(transferTo);
            //     }

            //     filters2.transferType = "group-group";
            // }

            let pipeline = [
                {
                    $match: {
                        isDeleted: false,
                        ...filters1,
                    },
                },
                {
                    $lookup: {
                        from: "groupareas",
                        localField: "transferFrom",
                        foreignField: "_id",
                        as: "transferFromGroup",
                    },
                },
                {
                    $lookup: {
                        from: "airports",
                        localField: "transferFrom",
                        foreignField: "_id",
                        as: "transferFromAirport",
                    },
                },
                {
                    $lookup: {
                        from: "groupareas",
                        localField: "transferTo",
                        foreignField: "_id",
                        as: "transferToGroup",
                    },
                },
                {
                    $lookup: {
                        from: "airports",
                        localField: "transferTo",
                        foreignField: "_id",
                        as: "transferToAirport",
                    },
                },
                {
                    $set: {
                        transferFromDetails: { $arrayElemAt: ["$transferFromGroup", 0] },
                        transferToDetails: { $arrayElemAt: ["$transferToGroup", 0] },
                    },
                },
                {
                    $addFields: {
                        transferFrom: {
                            $cond: [
                                {
                                    $or: [
                                        { $eq: ["$transferType", "group-group"] },
                                        { $eq: ["$transferType", "group-airport"] },
                                    ],
                                },
                                { $arrayElemAt: ["$transferFromGroup.name", 0] },
                                { $arrayElemAt: ["$transferFromAirport.airportName", 0] },
                            ],
                        },
                        transferTo: {
                            $cond: [
                                {
                                    $or: [
                                        { $eq: ["$transferType", "group-group"] },
                                        { $eq: ["$transferType", "airport-group"] },
                                    ],
                                },
                                { $arrayElemAt: ["$transferToGroup.name", 0] },
                                { $arrayElemAt: ["$transferToAirport.airportName", 0] },
                            ],
                        },
                    },
                },

                { $sort: { createdAt: -1 } },
                {
                    $group: {
                        _id: null,
                        totalTransfer: { $sum: 1 },
                        data: { $push: "$$ROOT" },
                    },
                },
                {
                    $project: {
                        totalTransfer: 1,
                        data: {
                            $slice: ["$data", Number(limit) * Number(skip), Number(limit)],
                        },
                    },
                },
            ];

            const transfer = await Transfer.aggregate(pipeline);

            // const profile = await MarketStrategy.findOne({ isDeleted: false, _id: profileId });
            const transferList = [];
            transfer[0]?.data?.forEach((transfer) => {
                // const transferMarkup = profile?.transfer?.find(
                //     (a) => a?.transferId?.toString() === transfer?._id?.toString()
                // );

                transferList.push({
                    transferId: transfer?._id,
                    transferFrom: transfer?.transferFrom,
                    transferTo: transfer?.transferTo,
                    // markupType: transferMarkup?.markupType || "flat",
                    // markup: transferMarkup?.markup || 0,
                });
            });

            res.status(200).json({
                transfers: transferList,
                totalTransfer: transfer[0].totalTransfer,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllTransferVehciles: async (req, res) => {
        try {
            const { transferId, profileId } = req.params;

            console.log(transferId, profileId);

            const transfer = await Transfer.findById(transferId).populate("vehicleType.vehicle");

            const profile = await MarketStrategy.findOne({ isDeleted: false, _id: profileId });

            const transferIndex = profile?.transfer?.findIndex(
                (a) => a?.transferId?.toString() === transferId?.toString()
            );

            let vehicles = [];
            transfer?.vehicleType?.forEach((vehTy) => {
                if (transferIndex !== -1) {
                    const vehicle = profile?.transfer[transferIndex]?.vehicleType?.find(
                        (a) => a?.vehicleId?.toString() === vehTy?.vehicle?._id?.toString()
                    );

                    if (vehicle) {
                        // Assuming transfer.vehicleType is an array
                        vehicles.push({
                            vehicleId: vehTy?.vehicle?._id,
                            vehicleName: vehTy?.vehicle?.name,
                            markupType: vehicle?.markupType || "flat",
                            markup: vehicle?.markup || 0,
                        });
                    } else {
                        vehicles.push({
                            vehicleId: vehTy?.vehicle?._id,
                            vehicleName: vehTy?.vehicle?.name,
                            markupType: "flat",
                            markup: 0,
                        });
                    }
                } else {
                    vehicles.push({
                        vehicleId: vehTy?.vehicle?._id,
                        vehicleName: vehTy?.vehicle?.name,
                        markupType: "flat",
                        markup: 0,
                    });
                }
            });

            res.status(200).json(vehicles);
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    applyAdminMarketStrategy: async (req, res) => {
        try {
            const { adminId, profileId } = req.body;
            if (!isValidObjectId(adminId)) {
                return sendErrorResponse(res, 400, "Invalid adminId ");
            }

            if (!isValidObjectId(profileId)) {
                return sendErrorResponse(res, 400, "Invalid profileId ");
            }

            const profile = await MarketStrategy.findOne({ _id: profileId });

            if (!profile) {
                return sendErrorResponse(res, 400, "Market strategy does not exist");
            }

            const admin = await Admin.findOne({ _id: adminId });
            if (!admin) {
                return sendErrorResponse(res, 400, "Admin strategy does not exist");
            }

            admin.marketStrategy = profile._id;
            await admin.save();

            res.status(200).json({ message: "updated successfully" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    applyResellerMarketStrategy: async (req, res) => {
        try {
            const { resellerId, profileId } = req.body;
            if (!isValidObjectId(resellerId)) {
                return sendErrorResponse(res, 400, "Invalid resellerId ");
            }

            if (!isValidObjectId(profileId)) {
                return sendErrorResponse(res, 400, "Invalid profileId ");
            }

            const profile = await MarketStrategy.findOne({ _id: profileId });

            if (!profile) {
                return sendErrorResponse(res, 400, "Market strategy does not exist");
            }

            const reseller = await Reseller.findOne({ _id: resellerId });
            if (!reseller) {
                return sendErrorResponse(res, 400, "Admin strategy does not exist");
            }

            reseller.marketStrategy = profile._id;
            await reseller.save();

            res.status(200).json({ message: "updated successfully" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    cloneMarket: async (req, res) => {
        try {
            const { profileId } = req.params;
            const { name } = req.body;

            if (!isValidObjectId(profileId)) {
                return sendErrorResponse(res, 400, "Invalid Id ");
            }

            const selectedProfile = await MarketStrategy.findOne({
                isDeleted: false,
                _id: profileId,
            });

            if (!selectedProfile) {
                return sendErrorResponse(res, 400, "Invalid market ");
            }

            const profile = new MarketStrategy({
                name,
            });
            profile.activities = selectedProfile?.activities;
            profile.atoA = selectedProfile?.atoA;
            profile.visa = selectedProfile?.visa;
            profile.quotation = selectedProfile?.quotation;
            profile.hotel = selectedProfile?.hotel;
            profile.starCategory = selectedProfile?.starCategory;
            profile.flight = selectedProfile?.flight;
            profile.insurance = selectedProfile?.insurance;
            profile.attraction = selectedProfile?.attraction;
            profile.transfer = selectedProfile?.transfer;

            await profile.save();
            res.status(200).json({
                message: "cloned successfully",
                profileId: profile._id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
