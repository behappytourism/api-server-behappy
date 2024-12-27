const { sendErrorResponse } = require("../../../helpers");
const { isValidObjectId, Types } = require("mongoose");
const MarkupProfile = require("../../models/markupProfile.model");
const {
    AttractionActivity,
    VisaType,
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
    B2BMarkupProfile,
} = require("../../../b2b/models");
const RoomType = require("../../../models/hotel/roomType.model");
const { Hotel, HotelBedRoomType } = require("../../../models/hotel");
const OttilaRoomType = require("../../../models/hotel/ottilaRoomType.model");
const B2BHotelProvider = require("../../../b2b/models/hotel/b2bHotelProviders.model");

module.exports = {
    addB2bSingleProfile: async (req, res) => {
        try {
            const { resellerId, profileId } = req.body;

            const profile = await MarkupProfile.findOne({ _id: profileId }).select({
                "activities._id": 0,
                "visa._id": 0,
                "a2a._id": 0,
                "hotel._id": 0,
                "starCategory._id": 0,
                "flight._id": 0,
                "insurance._id": 0,
                createdAt: 0,
                updatedAt: 0,
                resellerIds: 0,
                __v: 0,
            });

            const existingB2BMarkupProfile = await B2BMarkupProfile.findOne({ resellerId });

            if (existingB2BMarkupProfile) {
                await B2BMarkupProfile.updateOne(
                    { resellerId },
                    {
                        $set: {
                            selectedProfile: profile._id,
                            activities: profile.activities,
                            visa: profile.visa,
                            atoA: profile.atoA,
                            hotel: profile.hotel,
                            quotation: profile.quotation,
                            starCategory: profile.starCategory,
                            flight: profile.flight,
                            insurance: profile.insurance,
                        },
                    }
                );
            } else {
                const newB2BMarkupProfile = new B2BMarkupProfile({
                    selectedProfile: profile._id,
                    activities: profile.activities,
                    visa: profile.visa,
                    atoA: profile.atoA,
                    hotel: profile.hotel,
                    quotation: profile.quotation,
                    starCategory: profile.starCategory,
                    flight: profile.flight,
                    insurance: profile.insurance,

                    resellerId,
                });
                await newB2BMarkupProfile.save();
            }

            res.status(200).json({ message: "updated successfully" });
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

            const profile = await B2BMarkupProfile.findOne({ resellerId });

            res.status(200).json(profile);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateB2bProfile: async (req, res) => {
        try {
            const { activities, visa, atoA, hotel, quotation, starCategory } = req.body;
            const { resellerId } = req.params;

            if (!isValidObjectId(resellerId)) {
                return sendErrorResponse(res, 400, "Invalid profile ID");
            }

            const profile = await B2BMarkupProfile.findOne({ resellerId });

            if (!profile) {
                return sendErrorResponse(res, 404, "Profile not found");
            }

            if (profile.isDeleted) {
                return sendErrorResponse(res, 400, "Profile has been deleted");
            }

            profile.activities = activities || profile.activities;
            profile.visa = visa || profile.visa;
            profile.atoA = atoA || profile.atoA;
            profile.hotel = hotel || profile.hotel;
            profile.quotation = quotation || profile.quotation;
            profile.starCategory = starCategory || profile.starCategory;
            profile.flight = flight || profile?.flight;
            profile.insurance = insurance || profile?.insurance;

            await profile.save();

            res.status(200).json({ profile });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateAllB2bProfile: async (req, res) => {
        const { profileId } = req.params;

        try {
            const profile = await MarkupProfile.findOne({ _id: profileId, isDeleted: false });

            if (!profile) {
                return sendErrorResponse(res, 404, "Profile not found");
            }

            if (profile.isDeleted) {
                return sendErrorResponse(res, 400, "Profile has been deleted");
            }

            await B2BMarkupProfile.updateMany(
                { selectedProfile: profileId },
                {
                    activities: profile.activities,
                    atoA: profile.atoA,
                    visa: profile.visa,
                    hotel: profile.hotel,
                    quotation: profile.quotation,
                    starCategory: profile?.starCategory,
                    flight: profile?.flight,
                    insurance: profile?.insurance,
                }
            );

            res.status(200).json("Profiles updated successfully");
        } catch (error) {
            sendErrorResponse(res, 400, error.message);
        }
    },

    getProfileB2b: async (req, res) => {
        try {
            const { profileId } = req.params;

            const b2b = await B2BMarkupProfile.aggregate([
                {
                    $match: {
                        selectedProfile: Types.ObjectId(profileId),
                    },
                },
                {
                    $lookup: {
                        from: "resellers", // assuming the model name for the reseller collection is "Reseller"
                        localField: "resellerId",
                        foreignField: "_id",
                        as: "resellerId",
                    },
                },
                {
                    $unwind: "$resellerId",
                },
                {
                    $project: {
                        resellerId: {
                            companyName: 1,
                            name: 1,
                            email: 1,
                            _id: 1,
                        },
                    },
                },
            ]);

            if (!b2b) {
                return sendErrorResponse(res, 404, "reseller not found");
            }

            res.status(200).json(b2b);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateAllB2bProfileChanged: async (req, res) => {
        const { profileId } = req.params;

        const { selectedId } = req.body;

        try {
            const profile = await MarkupProfile.findOne({ _id: profileId, isDeleted: false });

            if (!profile) {
                return sendErrorResponse(res, 404, "Profile not found");
            }

            if (profile.isDeleted) {
                return sendErrorResponse(res, 400, "Profile has been deleted");
            }

            if (selectedId.length < 1) {
                return sendErrorResponse(res, 400, "Select atleast one reseller ");
            }

            for (let i = 0; i < selectedId.length; i++) {
                const selectedProfile = await B2BMarkupProfile.findOne({
                    selectedProfile: profileId,
                    resellerId: selectedId[i],
                });

                if (!selectedProfile) {
                    return sendErrorResponse(res, 400, "Selected markup profile not found");
                }

                // const promises = [];
                // promises.push();

                const activities = profile?.activities?.map((activity) => {
                    const selectedActivity = selectedProfile?.activities?.find((act) => {
                        return activity?.activity?.toString() === act?.activity?.toString();
                    });
                    if (selectedActivity?.isEdit === true) {
                        return selectedActivity;
                    } else {
                        return activity;
                    }
                });

                const a2as = profile?.atoA?.map((atoa) => {
                    const selectedA2a = selectedProfile?.atoA?.find((a2a) => {
                        return a2a?.atoa?.toString() === atoa?.atoa?.toString();
                    });
                    if (selectedA2a?.isEdit === true) {
                        return selectedA2a;
                    } else {
                        return atoa;
                    }
                });

                const visas = profile?.visa?.map((vs) => {
                    const selectedVisa = selectedProfile?.visa?.find((vsa) => {
                        return vsa?.visa?.toString() === vs?.visa?.toString();
                    });
                    if (selectedVisa?.isEdit === true) {
                        return selectedVisa;
                    } else {
                        return vs;
                    }
                });

                const hotel = profile?.hotel?.map((ht) => {
                    const selectedHotel = selectedProfile?.hotel?.find((htl) => {
                        return ht?.hotelId?.toString() === htl?.hotelId?.toString();
                    });

                    if (selectedHotel) {
                        const htls = ht?.roomTypes?.map((roomType) => {
                            const selectedRoomType = selectedHotel?.roomTypes?.find((roomTY) => {
                                return (
                                    roomTY?.roomTypeId?.toString() ===
                                    roomType?.roomTypeId?.toString()
                                );
                            });

                            if (selectedRoomType?.isEdit === true) {
                                return selectedRoomType;
                            } else {
                                return roomType;
                            }
                        });

                        return { ...ht, roomTypes: htls }; // Update the roomTypes property
                    } else {
                        return ht;
                    }
                });

                const starCategory = profile?.starCategory?.map((sc) => {
                    const selecteStarCategory = selectedProfile?.starCategory?.find((starCat) => {
                        return starCat?.name?.toString() === sc?.name?.toString();
                    });

                    if (selecteStarCategory?.isEdit === true) {
                        return selecteStarCategory;
                    } else {
                        return sc;
                    }
                });

                const flight = profile?.flight?.map((fgt) => {
                    const selectedFligth = selectedProfile?.flight?.find((ft) => {
                        return ft?.airlineCode?.toString() === fgt?.airlineCode?.toString();
                    });
                    if (selectedFligth?.isEdit === true) {
                        return selectedFligth;
                    } else {
                        return fgt;
                    }
                });

                const insurance = profile?.insurance?.map((ins) => {
                    const selectedInsurance = selectedProfile?.insurance?.find((ine) => {
                        return ine?.insuranceId?.toString() === ins?.insuranceId?.toString();
                    });
                    if (selectedInsurance?.isEdit === true) {
                        return selectedInsurance;
                    } else {
                        return ins;
                    }
                });

                const updatedProfile = await B2BMarkupProfile.updateOne(
                    {
                        selectedProfile: selectedProfile?.selectedProfile,
                        resellerId: selectedProfile?.resellerId,
                    },
                    {
                        $set: {
                            activities: activities,
                            atoA: a2as,
                            visa: visas,
                            hotel: hotel,
                            starCategory: starCategory,
                            flight: flight,
                            insurance: insurance,
                        },
                    }
                );
            }

            res.status(200).json("Profiles updated successfully");
        } catch (error) {
            console.log(error, "err");
            sendErrorResponse(res, 400, error.message);
        }
    },

    ////// from profile

    addProfile: async (req, res) => {
        try {
            const { name } = req.body;

            const profile = new MarkupProfile({
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

    updateActivityProfile: async (req, res) => {
        try {
            const { activity, markup, markupType } = req.body;

            const { id } = req.params;

            if (!isValidObjectId(activity)) {
                return sendErrorResponse(res, 400, "Invalid Activity id");
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid profile id");
            }

            const existingProfile = await B2BMarkupProfile.findOne({
                resellerId: id,
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
                    existingProfile.activities[existingActivityIndex].isEdit = true;
                } else {
                    existingProfile.activities.push({
                        activity,
                        markup,
                        markupType,
                        isEdit: true,
                    });
                }
            }

            await existingProfile.save();

            res.status(200).json({ message: "Profile updated" });
        } catch (err) {
            console.log(err, "error");
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

            const existingProfile = await B2BMarkupProfile.findOne({
                resellerId: id,
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
                    existingProfile.visa[existingVisaIndex].isEdit = true;
                } else {
                    existingProfile.visa.push({
                        visa,
                        markup,
                        markupType,
                        isEdit: true,
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

            const existingProfile = await B2BMarkupProfile.findOne({
                resellerId: id,
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
                    existingProfile.atoA[existingA2aIndex].isEdit = true;
                } else {
                    existingProfile.atoA.push({
                        atoa,
                        markup,
                        markupType,
                        isEdit: true,
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

            const existingProfile = await B2BMarkupProfile.findOne({
                resellerId: id,
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
                                    isUpdated = true;
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

            const existingProfile = await B2BMarkupProfile.findOne({
                resellerId: id,
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
                            isEdit: true,
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
                                isEdit: true,
                            },
                        ],
                    };

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

    updateHotelRoomType: async (req, res) => {
        try {
            const { hotelId, markup, markupType, markupApi, markupTypeApi, providers } = req.body;

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

            const existingProfile = await B2BMarkupProfile.findOne({
                resellerId: id,
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

                const roomTypes = await RoomTypeModel.find({ hotel: hotelId });

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
                                existingProfile.hotel[existingHotelIndex].roomTypes[
                                    existingRoomTypeIndex
                                ].markupType = markupType;
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

        const existingProfile = await B2BMarkupProfile.findOne({
            isDeleted: false,
            resellerId: id,
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

    updateQuotation: async (req, res) => {
        try {
            const {
                hotelMarkupType,
                hotelMarkup,
                landAttractionMarkupType,
                landAttractionMarkup,
                landTransferMarkupType,
                landTransferMarkup,
                visaMarkupType,
                visaMarkup,
            } = req.body;

            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid profile id");
            }

            const existingProfile = await B2BMarkupProfile.findOneAndUpdate(
                {
                    resellerId: id,
                    isDeleted: false,
                },
                {
                    quotation: {
                        hotelMarkupType,
                        hotelMarkup,
                        landAttractionMarkupType,
                        landAttractionMarkup,
                        landTransferMarkupType,
                        landTransferMarkup,
                        visaMarkupType,
                        visaMarkup,
                        isEdit: true,
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
    updateSingleTransferProfile: async (req, res) => {
        try {
            const { transferId, markup, markupType } = req.body;

            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid profile id");
            }

            console.log(transferId, id, "transferId");

            const transfer = await Transfer.findOne({ _id: transferId, isDeleted: false });
            if (!transfer) {
                return sendErrorResponse(res, 400, "Transfers not found");
            }

            const existingProfile = await B2BMarkupProfile.findOne({
                resellerId: id,
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

            const existingProfile = await B2BMarkupProfile.findOne({
                resellerId: id,
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

            const existingProfile = await B2BMarkupProfile.findOne({
                resellerId: id,
                isDeleted: false,
            });

            console.log(existingProfile, "existing", id, transferId, vehicleId);

            if (!existingProfile) {
                return sendErrorResponse(res, 400, "Profile not found");
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

    deleteProfile: async (req, res) => {
        try {
            const { id } = req.params;

            const profile = await MarkupProfile.findByIdAndUpdate(id, { isDeleted: true });

            if (!profile) {
                return sendErrorResponse(res, 404, "Profile not found");
            }

            res.json({ message: "Profile deleted successfully" });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    getAllAttractionActivities: async (req, res) => {
        try {
            const { profileId } = req.params;

            if (!isValidObjectId(profileId)) {
                return sendErrorResponse(res, 400, "Invalid profileId ");
            }

            const profile = await B2BMarkupProfile.findOne({ resellerId: profileId });

            const activities = await AttractionActivity.find({ isDeleted: false }).populate(
                "attraction"
            );

            const attractionList = [];

            activities.forEach((activity) => {
                if (!activity?.attraction?.isDeleted) {
                    const attraction = activity?.attraction;
                    const existingAttraction = attractionList?.find(
                        (a) => a?._id === attraction?._id
                    );

                    const act = profile.activities.find(
                        (a) => a?.activity?.toString() === activity?._id?.toString()
                    );

                    const { _id, name, activityType } = activity;

                    if (existingAttraction) {
                        existingAttraction.activities.push({
                            _id: _id,
                            markup: act?.markup || 0,
                            markupType: act?.markupType || "flat",
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
                                    name,
                                    activityType,
                                },
                            ],
                        };
                        attractionList.push(newAttraction);
                    }
                }
            });

            res.status(200).json(attractionList);
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

            const profile = await B2BMarkupProfile.findOne({
                isDeleted: false,
                resellerId: profileId,
            });

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

            const profile = await B2BMarkupProfile.findOne({
                isDeleted: false,
                resellerId: profileId,
            });

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

            const profile = await B2BMarkupProfile.findOne({
                resellerId: profileId,
                isDeleted: false,
            });

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

                let matched = false;
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
                .select("hotelName hbId ottilaId contractId")
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

            const profile = await B2BMarkupProfile.findOne({
                isDeleted: false,
                resellerId: profileId,
            });

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

        const profile = await B2BMarkupProfile.findOne({
            isDeleted: false,
            resellerId: profileId,
        });

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
            const profile = await B2BMarkupProfile.findOne({
                isDeleted: false,
                resellerId: profileId,
            });

            const quotation = {
                hotelMarkupType: profile?.quotation?.hotelMarkupType || "flat",
                hotelMarkup: profile?.quotation?.hotelMarkup || 0,
                landAttractionMarkupType: profile?.quotation?.landAttractionMarkupType || "flat",
                landAttractionMarkup: profile?.quotation?.landAttractionMarkup || 0,
                landTransferMarkupType: profile?.quotation?.landTransferMarkupType || "flat",
                landTransferMarkup: profile?.quotation?.landTransferMarkup || 0,
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

            const profile = await B2BMarkupProfile.findOne({
                isDeleted: false,
                resellerId: profileId,
            });

            const airlineList = [];
            airlines.forEach((airline) => {
                const airlineMarkup = profile?.flight?.find(
                    (a) => a?.airlineCode?.toString() === airline?.airlineCode?.toString()
                );

                airlineList.push({
                    airlineCode: airline.airlineCode,
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

            const existingProfile = await B2BMarkupProfile.findOne({
                resellerId: id,
                isDeleted: false,
            });

            if (!existingProfile) {
                return sendErrorResponse(res, 400, "Profile not found");
            }

            if (existingProfile) {
                let existingFlightIndex = existingProfile?.flight.findIndex((fgt) => {
                    return fgt?.airlineCode?.toString() === airlineCode?.toString();
                });

                if (existingFlightIndex !== -1) {
                    existingProfile.flight[existingFlightIndex].markup = markup;
                    existingProfile.flight[existingFlightIndex].markupType = markupType;
                    existingProfile.flight[existingFlightIndex].isEdit = true;
                } else {
                    existingProfile.flight.push({
                        airlineCode,
                        markup,
                        markupType,
                        isEdit: true,
                    });
                }
            }

            await existingProfile.save();

            res.status(200).json({ message: "Profile updated" });
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

            const profile = await B2BMarkupProfile.findOne({
                isDeleted: false,
                resellerId: profileId,
            });

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

    updateInsuranceProfile: async (req, res) => {
        try {
            const { insuranceId, markup, markupType } = req.body;

            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid profile id");
            }

            const existingProfile = await B2BMarkupProfile.findOne({
                resellerId: id,
                isDeleted: false,
            });

            if (!existingProfile) {
                return sendErrorResponse(res, 400, "Profile not found");
            }

            if (existingProfile) {
                let existingInsurnanceIndex = existingProfile?.insurance.findIndex((ins) => {
                    return ins?.insuranceId?.toString() === insuranceId?.toString();
                });

                if (existingInsurnanceIndex !== -1) {
                    existingProfile.insurance[existingInsurnanceIndex].markup = markup;
                    existingProfile.insurance[existingInsurnanceIndex].markupType = markupType;
                    existingProfile.insurance[existingInsurnanceIndex].isEdit = true;
                } else {
                    existingProfile.insurance.push({
                        insuranceId,
                        markup,
                        markupType,
                        isEdit: true,
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

            const existingProfile = await B2BMarkupProfile.findOne({
                resellerId: id,
                isDeleted: false,
            });

            if (!existingProfile) {
                return sendErrorResponse(res, 400, "Profile not found");
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

    updateHotelArray: async (req, res) => {
        try {
            let profiles = await MarkupProfile.find({});

            for (let i = 0; i < profiles.length; i++) {
                let profile = profiles[i];

                profile.hotel = [];

                await profile.save();
            }
        } catch (err) {
            console.log(err);
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

            const transfer = await Transfer.findById(transferId).populate("vehicleType.vehicle");

            const profile = await B2BMarkupProfile.findOne({
                isDeleted: false,
                resellerId: profileId,
            });

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
};
