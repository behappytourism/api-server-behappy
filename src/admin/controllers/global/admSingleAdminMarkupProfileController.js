const { sendErrorResponse } = require("../../../helpers");
const { isValidObjectId, Types } = require("mongoose");
const MarkupProfile = require("../../models/markupProfile.model");
const { AttractionActivity, VisaType, Airline, InsurancePlan } = require("../../../models");
const mongoose = require("mongoose");
const {
    B2BSpecialVisaMarkup,
    B2BA2a,
    B2BSpecialA2aMarkup,
    B2BSpecialAttractionMarkup,
    B2BMarkupProfile,
} = require("../../../b2b/models");
const RoomType = require("../../../models/hotel/roomType.model");
const { Hotel } = require("../../../models/hotel");

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

                            console.log(selectedRoomType, "selected roomtype");

                            if (selectedRoomType?.isEdit === true) {
                                return selectedRoomType;
                            } else {
                                return roomType;
                            }
                        });

                        console.log(htls, "selected");

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

                console.log(updatedProfile, "updatedProfile");
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
            const { name, markup, markupType, markupApi, markupTypeApi } = req.body;

            const { id } = req.params;

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
                let existingStarCategoryIndex = existingProfile?.starCategory.findIndex(
                    (starCat) => {
                        return starCat?.name?.toString() === name?.toString();
                    }
                );

                if (existingStarCategoryIndex !== -1) {
                    existingProfile.starCategory[existingStarCategoryIndex].markup = markup;
                    existingProfile.starCategory[existingStarCategoryIndex].markupType = markupType;
                    existingProfile.starCategory[existingStarCategoryIndex].markupApi = markupApi;
                    existingProfile.starCategory[existingStarCategoryIndex].markupTypeApi =
                        markupTypeApi;
                    existingProfile.starCategory[existingStarCategoryIndex].isEdit = true;
                } else {
                    existingProfile.starCategory.push({
                        name,
                        markup,
                        markupType,
                        markupApi,
                        markupTypeApi,
                        isEdit: true,
                    });
                }
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
            const { hotelId, roomTypeId, markup, markupType, markupApi, markupTypeApi } = req.body;

            const { id } = req.params;

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
                let existingHotelIndex = existingProfile?.hotel.findIndex((hot) => {
                    return hot?.hotelId?.toString() === hotelId?.toString();
                });

                if (existingHotelIndex !== -1) {
                    let existingRoomTypeIndex = existingProfile?.hotel[
                        existingHotelIndex
                    ]?.roomTypes?.findIndex((roomType) => {
                        return roomType?.roomTypeId?.toString() === roomTypeId?.toString();
                    });

                    if (existingRoomTypeIndex !== -1) {
                        existingProfile.hotel[existingHotelIndex].roomTypes[
                            existingRoomTypeIndex
                        ].markup = markup;
                        existingProfile.hotel[existingHotelIndex].roomTypes[
                            existingRoomTypeIndex
                        ].markupType = markupType;
                        existingProfile.hotel[existingHotelIndex].roomTypes[
                            existingRoomTypeIndex
                        ].markupApi = markupApi;
                        existingProfile.hotel[existingHotelIndex].roomTypes[
                            existingRoomTypeIndex
                        ].markupTypeApi = markupTypeApi;
                        existingProfile.hotel[existingHotelIndex].roomTypes[
                            existingRoomTypeIndex
                        ].isEdit = true;
                    } else {
                        existingProfile.hotel[existingHotelIndex].roomTypes.push({
                            roomTypeId,
                            markup,
                            markupType,
                            markupApi,
                            markupTypeApi,
                            isEdit: true,
                        });
                    }
                } else {
                    const newHotelData = {
                        hotelId,
                        roomTypes: [
                            {
                                roomTypeId,
                                markup,
                                markupType,
                                markupApi,
                                markupTypeApi,
                                isEdit: true,
                            },
                        ],
                    };

                    existingProfile.hotel.push(newHotelData);
                }
            }

            await existingProfile.save();

            console.log(existingProfile.hotel[0].roomTypes, "existingProfile");

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

            const existingProfile = await B2BMarkupProfile.findOneAndUpdate(
                {
                    resellerId: id,
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
                const attraction = activity.attraction;
                const existingAttraction = attractionList.find((a) => a._id === attraction._id);

                const act = profile.activities.find(
                    (a) => a.activity.toString() === activity._id.toString()
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
                        _id: attraction._id,
                        name: attraction.title,
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
            const { profileId } = req.params;

            if (!isValidObjectId(profileId)) {
                return sendErrorResponse(res, 400, "Invalid profileId ");
            }
            const categories = ["1", "2", "3", "4", "5", "appartment"];

            const profile = await B2BMarkupProfile.findOne({
                resellerId: profileId,
                isDeleted: false,
            });

            const categoryList = [];

            for (const category of categories) {
                const categoryMarkup = profile?.starCategory?.find((starCate) => {
                    return starCate?.name?.toString() === category?.toString();
                });

                categoryList.push({
                    markupType: categoryMarkup?.markupType || "flat",
                    markup: categoryMarkup?.markup || 0,
                    markupTypeApi: categoryMarkup?.markupTypeApi || "flat",
                    markupApi: categoryMarkup?.markupApi || 0,
                    name: category,
                });
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
            const { profileId, hotelId } = req.params;

            if (!isValidObjectId(profileId)) {
                return sendErrorResponse(res, 400, "Invalid profileId ");
            }

            if (!isValidObjectId(hotelId)) {
                return sendErrorResponse(res, 400, "Invalid hotelId ");
            }

            const roomTypes = await RoomType.find({ isDeleted: false, hotel: hotelId });

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
                        (a) => a?.roomTypeId?.toString() === roomType?._id?.toString()
                    );

                    if (selectedRoomType) {
                        roomTypeList.push({
                            roomName: roomType?.roomName,

                            roomTypeId: roomType?._id,
                            hotelId: roomType?.hotel,
                            markupType: selectedRoomType.markupType || "flat",
                            markup: selectedRoomType.markup || 0,
                            markupTypeApi: selectedRoomType.markupTypeApi || "flat",
                            markupApi: selectedRoomType.markupApi || 0,
                        });
                    } else {
                        roomTypeList.push({
                            roomName: roomType?.roomName,

                            roomTypeId: roomType?._id,
                            hotelId: roomType?.hotel,
                            markupType: "flat",
                            markup: 0,
                            markupTypeApi: "flat",
                            markupApi: 0,
                        });
                    }
                } else {
                    roomTypeList.push({
                        roomName: roomType?.roomName,

                        roomTypeId: roomType?._id,
                        hotelId: roomType?.hotel,
                        markupType: "flat",
                        markup: 0,
                        markupTypeApi: "flat",
                        markupApi: 0,
                    });
                }
            });

            res.status(200).json(roomTypeList);
        } catch (err) {
            console.error(err);

            sendErrorResponse(res, 500, err);
        }
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

    updateHotelArray: async (req, res) => {
        try {
            console.log("call reached");
            let profiles = await MarkupProfile.find({});

            for (let i = 0; i < profiles.length; i++) {
                let profile = profiles[i];

                profile.hotel = [];

                console.log(i, "I");
                await profile.save();
            }
        } catch (err) {
            console.log(err);
        }
    },
};
