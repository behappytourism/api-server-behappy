const { isValidObjectId, Types } = require("mongoose");
const { B2BMarkupProfile } = require("../../../b2b/models");
const { Country } = require("../../../models");

const { sendErrorResponse } = require("../../../helpers");
const {
    Attraction,
    AttractionCategory,
    AttractionActivity,
    Destination,
    VehicleType,
} = require("../../../models");
const { State, City, Area, Market } = require("../../../models/global");
const {
    attractionApi,
    getAgentTickets,
    getLeastPriceOfDay,
    getBalance,
    AuthenticationRequest,
} = require("../../helpers");
const MarkupProfile = require("../../models/markupProfile.model");

const {
    attractionSchema,
    attractionActivitySchema,
} = require("../../validations/attraction.schema");
const SeoSetting = require("../../../models/seo/seoSetting.model");

module.exports = {
    createNewAttraction: async (req, res) => {
        try {
            const {
                title,
                category,
                isActive,
                mapLink,
                isOffer,
                offerAmountType,
                offerAmount,
                youtubeLink,
                sections,
                isCustomDate,
                startDate,
                endDate,
                duration,
                durationType,
                availability,
                offDates,
                bookingType,
                destination,
                highlights,
                itineraryDescription,
                faqs,
                cancellationType,
                cancelBeforeTime,
                cancellationFee,
                isApiConnected,
                connectedApi,
                isCombo,
                bookingPriorDays,
                country,
                city,
                area,
                state,
                longitude,
                latitude,
                displayOrder,
            } = req.body;

            const { _, error } = attractionSchema.validate({
                ...req.body,
                sections: sections ? JSON.parse(sections) : [],
                faqs: faqs ? JSON.parse(faqs) : [],
                offDates: offDates ? JSON.parse(offDates) : [],
                availability: availability ? JSON.parse(availability) : [],
            });
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(country)) {
                return sendErrorResponse(res, 400, "invalid country id");
            }
            const countryDetail = await Country.findOne({
                _id: country,
                isDeleted: false,
            });
            if (!countryDetail) {
                return sendErrorResponse(res, 404, "country not found");
            }

            if (!isValidObjectId(state)) {
                return sendErrorResponse(res, 400, "invalid state id");
            }
            const stateDetail = await State.findOne({
                _id: state,
                isDeleted: false,
                country: countryDetail?._id,
            });
            if (!stateDetail) {
                return sendErrorResponse(res, 404, "state not found");
            }

            if (!isValidObjectId(city)) {
                return sendErrorResponse(res, 400, "invalid city id");
            }
            const cityDetail = await City.findOne({
                isDeleted: false,
                _id: city,
                country: countryDetail?._id,
            });
            if (!cityDetail) {
                return sendErrorResponse(res, 404, "city not found");
            }

            if (area) {
                if (!isValidObjectId(area)) {
                    return sendErrorResponse(res, 400, "invalid area id");
                }
                const areaDetail = await Area.findOne({
                    _id: area,
                    country: countryDetail?._id,
                    isDeleted: false,
                });
                if (!areaDetail) {
                    return sendErrorResponse(res, 404, "area not found");
                }
            }

            if (!isValidObjectId(category)) {
                return sendErrorResponse(res, 400, "Invalid category Id");
            }

            const attractionCategory = await AttractionCategory.findById(category);
            if (!attractionCategory) {
                return sendErrorResponse(res, 404, "Category not found!");
            }

            if (!isValidObjectId(destination)) {
                return sendErrorResponse(res, 400, "Invalid destination id");
            }

            const destinationDetails = await Destination.findOne({
                _id: destination,
                isDeleted: false,
            });

            if (!destinationDetails) {
                return sendErrorResponse(res, 404, "Destination not found");
            }

            let images = [];
            let image = req.files["images"];
            if (!image || image?.length < 1) {
                return sendErrorResponse(res, 400, "minimum 1 image is required");
            } else {
                for (let i = 0; i < image?.length; i++) {
                    const img = "/" + image[i]?.path?.replace(/\\/g, "/");
                    images.push(img);
                }
            }

            let logo;
            if (req.files["logo"]?.length > 0) {
                let logos = req.files["logo"];
                logo = "/" + logos[0]?.path?.replace(/\\/g, "/");
            }

            let parsedSections;
            if (sections) {
                parsedSections = JSON.parse(sections);
            }

            let parsedFaqs;
            if (faqs) {
                parsedFaqs = JSON.parse(faqs);
            }

            let parsedOffDates;
            if (offDates) {
                parsedOffDates = JSON.parse(offDates);
            }

            let parsedAvailability;
            if (availability) {
                parsedAvailability = JSON.parse(availability);
            }

            // if (isApiConnected) {
            //     let apiData = await attractionApi(res, connectedApi);
            // }

            let durationInSeconds = 0;
            if (durationType === "hours") {
                durationInSeconds = Number(duration) * 60 * 60;
            } else if (durationType === "days") {
                durationInSeconds = Number(duration) * 24 * 60 * 60;
            } else if (durationType === "months") {
                durationInSeconds = Number(duration) * 30 * 24 * 60 * 60;
            }

            const newAttraction = new Attraction({
                title,
                logo: logo ? logo : undefined,
                bookingType,
                category,
                mapLink,
                isOffer,
                offerAmountType,
                offerAmount,
                youtubeLink,
                images,
                sections: parsedSections,
                startDate,
                isCustomDate,
                endDate,
                offDates: parsedOffDates,
                availability: parsedAvailability,
                duration,
                durationType,
                durationInSeconds,
                destination,
                highlights,
                itineraryDescription,
                faqs: parsedFaqs,
                cancellationType,
                cancelBeforeTime,
                cancellationFee,
                isApiConnected,
                connectedApi: isApiConnected === "true" ? connectedApi : undefined,
                isCombo,
                bookingPriorDays,
                isActive: true,
                isB2cActive: true,
                isB2bActive: true,
                country,
                countryCode: countryDetail.isocode,
                city,
                area,
                state,
                longitude,
                latitude,
                displayOrder: displayOrder || 1,
            });
            await newAttraction.save();

            res.status(200).json(newAttraction);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateAttraction: async (req, res) => {
        try {
            const { id } = req.params;
            const {
                title,
                category,
                isActive,
                mapLink,
                isOffer,
                offerAmountType,
                offerAmount,
                youtubeLink,
                sections,
                isCustomDate,
                startDate,
                endDate,
                duration,
                durationType,
                availability,
                offDates,
                bookingType,
                destination,
                highlights,
                itineraryDescription,
                faqs,
                cancellationType,
                cancelBeforeTime,
                cancellationFee,
                isApiConnected,
                connectedApi,
                isCombo,
                oldImages,
                bookingPriorDays,
                longitude,
                latitude,
                country,
                state,
                city,
                area,
                displayOrder,
            } = req.body;

            const { _, error } = attractionSchema.validate({
                ...req.body,
                sections: sections ? JSON.parse(sections) : [],
                faqs: faqs ? JSON.parse(faqs) : [],
                offDates: offDates ? JSON.parse(offDates) : [],
                availability: availability ? JSON.parse(availability) : [],
                oldImages: oldImages ? JSON.parse(oldImages) : [],
            });
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid attraction id");
            }

            if (!isValidObjectId(country)) {
                return sendErrorResponse(res, 400, "invalid country id");
            }
            const countryDetail = await Country.findOne({
                _id: country,
                isDeleted: false,
            });
            if (!countryDetail) {
                return sendErrorResponse(res, 400, "country not found");
            }

            if (!isValidObjectId(state)) {
                return sendErrorResponse(res, 400, "invalid state id");
            }
            const stateDetail = await State.findOne({
                _id: state,
                isDeleted: false,
                country: countryDetail?._id,
            });
            if (!stateDetail) {
                return sendErrorResponse(res, 404, "state not found");
            }

            if (!isValidObjectId(city)) {
                return sendErrorResponse(res, 400, "invalid city id");
            }
            const cityDetail = await City.findOne({
                isDeleted: false,
                _id: city,
                country: countryDetail?._id,
            });
            if (!cityDetail) {
                return sendErrorResponse(res, 404, "city not found");
            }

            if (area) {
                if (!isValidObjectId(area)) {
                    return sendErrorResponse(res, 400, "invalid area id");
                }
                const areaDetail = await Area.findOne({
                    _id: area,
                    country: countryDetail?._id,
                    isDeleted: false,
                });
                if (!areaDetail) {
                    return sendErrorResponse(res, 404, "area not found");
                }
            }

            if (category && !isValidObjectId(category)) {
                return sendErrorResponse(res, 400, "Invalid category Id");
            }

            const attractionCategory = await AttractionCategory.findById(category);
            if (!attractionCategory) {
                return sendErrorResponse(res, 404, "Category not found!");
            }

            let parsedOldImages = [];
            if (oldImages) {
                parsedOldImages = JSON.parse(oldImages);
            }

            let images = [...parsedOldImages];

            if (req.files["images"]) {
                let image = req.files["images"];
                for (let i = 0; i < image.length; i++) {
                    const img = "/" + image[i]?.path?.replace(/\\/g, "/");
                    images.push(img);
                }
            }

            let logo;
            if (req.files["logo"]?.length > 0) {
                let logos = req.files["logo"];
                logo = "/" + logos[0]?.path?.replace(/\\/g, "/");
            }

            let parsedSections;
            if (sections) {
                parsedSections = JSON.parse(sections);
            }

            let parsedFaqs;
            if (faqs) {
                parsedFaqs = JSON.parse(faqs);
            }

            let parsedOffDates;
            if (offDates) {
                parsedOffDates = JSON.parse(offDates);
            }

            let parsedAvailability;
            if (availability) {
                parsedAvailability = JSON.parse(availability);
            }

            let durationInSeconds = 0;
            if (durationType === "hours") {
                durationInSeconds = Number(duration) * 60 * 60;
            } else if (durationType === "days") {
                durationInSeconds = Number(duration) * 24 * 60 * 60;
            } else if (durationType === "months") {
                durationInSeconds = Number(duration) * 30 * 24 * 60 * 60;
            }

            const attraction = await Attraction.findOneAndUpdate(
                { _id: id, isDeleted: false },
                {
                    title,
                    logo: logo ? logo : undefined,
                    bookingType,
                    category,
                    mapLink,
                    isActive,
                    isOffer,
                    offerAmountType,
                    offerAmount,
                    youtubeLink,
                    images: images,
                    sections: parsedSections,
                    startDate,
                    isCustomDate,
                    endDate,
                    offDates: parsedOffDates,
                    availability: parsedAvailability,
                    duration,
                    durationType,
                    durationInSeconds,
                    destination,
                    highlights,
                    itineraryDescription,
                    faqs: parsedFaqs,
                    cancellationType,
                    cancelBeforeTime,
                    cancellationFee,
                    isApiConnected,
                    connectedApi: isApiConnected === "true" ? connectedApi : undefined,
                    isCombo,
                    bookingPriorDays,
                    country,
                    countryCode: countryDetail.isocode,
                    city,
                    area,
                    state,
                    longitude,
                    latitude,
                    displayOrder: displayOrder || 1,
                },
                { runValidators: true, new: true }
            );

            if (!attraction) {
                return sendErrorResponse(res, 404, "Attraction not found");
            }

            res.status(200).json(attraction);
        } catch (err) {
            console.log(err, "error");
            sendErrorResponse(res, 500, err);
        }
    },

    updateAttractionSlug: async (req, res) => {
        try {
            const { id } = req.params;
            const { slug } = req.body;

            if (!slug) {
                return sendErrorResponse(res, 400, "slug not added");
            }

            const existingSlug = await Attraction.findOne({ slug: slug });

            if (existingSlug) {
                return sendErrorResponse(res, 400, "other slug already has this name ");
            }

            const attraction = await Attraction.findOne({ _id: id, isDeleted: false });
            if (!attraction) {
                return sendErrorResponse(res, 400, "attraction not found");
            }

            const seo = await SeoSetting.findOneAndUpdate(
                {
                    seoType: "products",
                    "seoCategory.name": "attraction",
                    "seoCategory.seoSubCategory.slug": attraction.slug,
                },
                {
                    $set: {
                        "seoCategory.$[category].seoSubCategory.$[subCategory].slug": slug,
                    },
                },
                {
                    new: true,
                    arrayFilters: [
                        { "category.name": "attraction" },
                        { "subCategory.slug": attraction.slug },
                    ],
                }
            );

            attraction.slug = slug;
            await attraction.save();

            res.status(200).json(attraction);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
    showBalance: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid attraction id!");
            }

            const attr = await Attraction.findById(id);
            if (!attr) {
                return sendErrorResponse(res, 404, "Attraction not found");
            }

            if (!attr.isApiConnected) {
                return sendErrorResponse(res, 404, "Api not Connected");
            }

            if (id == "63afca1b5896ed6d0f297449") {
                let balanceDetails = await getBalance(res, attr.connectedApi);

                res.status(200).json({ balanceDetails });
            }
        } catch (err) {}
    },

    connectApi: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid attraction id!");
            }

            const attr = await Attraction.findById(id);
            if (!attr) {
                return sendErrorResponse(res, 404, "Attraction not found");
            }

            if (!attr.isApiConnected) {
                return sendErrorResponse(res, 404, "Api not Connected");
            }

            if (id == "63afca1b5896ed6d0f297449") {
                let activities = [];

                let apiData;
                if (attr.isApiConnected) {
                    apiData = await attractionApi(res, attr.connectedApi);
                }

                for (i = 0; i < apiData.length; i++) {
                    let activity = null;

                    activity = await AttractionActivity.findOne({
                        attraction: attr._id,
                        isDeleted: false,
                        productId: apiData[i].productId,
                    });

                    if (activity == null) {
                        let newActivity = new AttractionActivity({
                            name: apiData[i].name,
                            attraction: attr._id,
                            isApiSync: true,
                            activityType: "normal",
                            productId: apiData[i].productId,
                            productCode: apiData[i].productCode,
                            // childPrice: apiData[i].prices[0].totalPrice,
                            // adultPrice: apiData[i].prices[0].totalPrice,
                            childCost: apiData[i].prices[0].totalPrice,
                            adultCost: apiData[i].prices[0].totalPrice,
                            adultAgeLimit: 60,
                            childAgeLimit: 10,
                            infantAgeLimit: 3,
                            isVat: true,
                            vat: apiData[i].prices[0].vatAmount,
                            base: "person",
                            isSharedTransferAvailable: false,
                            isPrivateTransferAvailable: false,
                            privateTransfers: [
                                {
                                    name: "Dubai Park",
                                    maxCapacity: 1,
                                    price: apiData[i].prices[0].totalPrice,
                                    cost: apiData[i].prices[0].totalPrice,
                                },
                            ],
                        });

                        await newActivity.save();
                        activities.push(newActivity);
                    } else {
                        activity.childCost = apiData[i].prices[0].totalPrice;
                        activity.adultCost = apiData[i].prices[0].totalPrice;
                        activity.isApiSync = true;
                        await activity.save();

                        activities.push(activity);
                    }
                }

                res.status(200).json({
                    message: "Updated Successfully",
                    activities: activities,
                });
            } else {
                let activities = [];
                let apiData;
                let auth = await AuthenticationRequest();

                if (attr.isApiConnected) {
                    apiData = await getAgentTickets(auth);
                }

                if (apiData && apiData.length > 0) {
                    await AttractionActivity.updateMany(
                        {
                            attraction: attr._id,
                            isDeleted: false,
                        },
                        { $set: { isActive: false } }
                    );
                }

                const processItem = async (data) => {
                    let activity = await AttractionActivity.findOne({
                        isDeleted: false,
                        attraction: attr._id,
                        productId: data.ResourceID,
                        productCode: data.EventtypeId,
                    });

                    let apiPriceData = await getLeastPriceOfDay(data);

                    if (activity == null && apiPriceData !== undefined) {
                        let newActivity = new AttractionActivity({
                            name: data.TicketName,
                            attraction: attr._id,
                            activityType: "normal",
                            productId: data.ResourceID,
                            productCode: data.EventtypeId,
                            childCost: apiPriceData.leastChildPrice,
                            adultCost: apiPriceData.leastAdultPrice,
                            childPrice: apiPriceData.leastChildPrice,
                            adultPrice: apiPriceData.leastAdultPrice,
                            adultAgeLimit: 60,
                            childAgeLimit: 10,
                            infantAgeLimit: 3,
                            isActive: true,
                            isVat: false,
                            isApiSync: true,
                            base: "person",
                            isSharedTransferAvailable: false,
                            isPrivateTransferAvailable: false,
                            privateTransfers: [
                                {
                                    name: "Burj Khalifa",
                                    maxCapacity: 1,
                                    price: apiPriceData.leastChildPrice,
                                    cost: apiPriceData.leastChildPrice,
                                },
                            ],
                        });

                        await newActivity.save();
                        activities.push(newActivity);
                    } else if (apiPriceData !== undefined) {
                        activity.childCost = apiPriceData.leastChildPrice;
                        activity.adultCost = apiPriceData.leastAdultPrice;
                        activity.isApiSync = true;
                        activity.isActive = true;

                        await activity.save();
                        activities.push(activity);
                    }
                };

                const processPromises = [];

                for (let i = 0; i < apiData.length; i++) {
                    processPromises.push(processItem(apiData[i]));
                }

                await Promise.all(processPromises);

                res.status(200).json({
                    message: "Updated Successfully",
                    activities,
                });
            }
        } catch (err) {
            console.log(err.message, "err");
            sendErrorResponse(res, 500, err);
        }
    },

    addAttractionActivity: async (req, res) => {
        try {
            let {
                attraction,
                name,
                description,
                activityType,
                adultAgeLimit,
                childAgeLimit,
                infantAgeLimit,
                isCancelable,
                isVat,
                vat,
                base,
                isSharedTransferAvailable,
                sharedTransferPrice,
                sharedTransferCost,
                isPrivateTransferAvailable,
                privateTransfers,
                isActive,
                peakTime,
                note,
                adultCost,
                childCost,
                infantCost,
                hourlyCost,
                markupUpdate,
                isPromoCode,
                promoCode,
                promoAmountAdult,
                promoAmountChild,
                isB2bPromoCode,
                b2bPromoCode,
                b2bPromoAmountAdult,
                b2bPromoAmountChild,
                termsAndConditions,
                overview,
                inculsionsAndExclusions,
            } = req.body;

            const { _, error } = attractionActivitySchema.validate({
                ...req.body,
                privateTransfers: privateTransfers ? JSON.parse(privateTransfers) : [],
            });
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(attraction)) {
                return sendErrorResponse(res, 400, "Invalid attraction id!");
            }

            const attr = await Attraction.findById(attraction);
            if (!attr) {
                return sendErrorResponse(res, 404, "Attraction not found");
            }

            let apiData;
            if (attr.isApiConnected) {
                apiData = await attractionApi(res, attr.connectedApi);
                adultCost = apiData;
                childCost = apiData;
            }

            if (attr.bookingType === "ticket" && activityType === "transfer") {
                return sendErrorResponse(
                    res,
                    400,
                    "you can't add transfer only activity in ticket attraction"
                );
            }

            if (activityType === "transfer") {
                if (
                    isSharedTransferAvailable === "false" &&
                    isPrivateTransferAvailable === "false"
                ) {
                    return sendErrorResponse(
                        res,
                        400,
                        "shared or private transfer is required for transfer type"
                    );
                }
            }

            let images = [];
            let image = req.files["images"];
            if (!image || image?.length < 1) {
                return sendErrorResponse(res, 400, "minimum 1 image is required");
            } else {
                for (let i = 0; i < image?.length; i++) {
                    const img = "/" + image[i]?.path?.replace(/\\/g, "/");
                    images.push(img);
                }
            }
            let parsedPrivateTransfers;
            if (privateTransfers) {
                parsedPrivateTransfers = JSON.parse(privateTransfers);
            }

            const newTicket = new AttractionActivity({
                attraction,
                name,
                activityType,
                description,
                base,
                adultAgeLimit,
                childAgeLimit,
                infantAgeLimit,
                adultCost: base !== "hourly" || activityType !== "transfer" ? adultCost : null,
                childCost: base !== "hourly" || activityType !== "transfer" ? childCost : null,
                infantCost: base !== "hourly" || activityType !== "transfer" ? infantCost : null,
                hourlyCost: base === "hourly" || activityType !== "transfer" ? hourlyCost : null,
                isCancelable,
                isVat,
                vat: isVat && vat,
                isSharedTransferAvailable,
                sharedTransferPrice: isSharedTransferAvailable && sharedTransferPrice,
                sharedTransferCost: isSharedTransferAvailable && sharedTransferCost,
                isPrivateTransferAvailable,
                privateTransfers: parsedPrivateTransfers,
                isActive,
                isB2cActive: true,
                isB2bActive: true,
                peakTime,
                note,
                images,
                isPromoCode,
                promoCode: isPromoCode && promoCode,
                promoAmountAdult: isPromoCode && promoAmountAdult,
                promoAmountChild: isPromoCode && promoAmountChild,
                isB2bPromoCode,
                b2bPromoCode: isB2bPromoCode && b2bPromoCode,
                b2bPromoAmountAdult: isB2bPromoCode && b2bPromoAmountAdult,
                b2bPromoAmountChild: isB2bPromoCode && b2bPromoAmountChild,
                termsAndConditions,
                overview,
                inculsionsAndExclusions,
            });
            await newTicket.save();

            // const updatedProfiles = await Promise.all(
            //     markupUpdate?.map(async (update) => {
            //         const updateProfile = await MarkupProfile.findOneAndUpdate(
            //             { _id: update.profileId },
            //             {
            //                 $push: {
            //                     activities: {
            //                         activity: newTicket._id,
            //                         markup: update.markup,
            //                         markupType: update.markupType,
            //                     },
            //                 },
            //             }
            //         );
            //         return updateProfile;
            //     })
            // );

            // const updatedB2bProfiles = await Promise.all(
            //     markupUpdate?.map(async (updateBb2) => {
            //         const updateProfile = await B2BMarkupProfile.updateMany(
            //             { selectedProfile: updateBb2.profileId },
            //             {
            //                 $push: {
            //                     activities: {
            //                         activity: newTicket._id,
            //                         markup: updateBb2.markup,
            //                         markupType: updateBb2.markupType,
            //                     },
            //                 },
            //             }
            //         );
            //         return updateProfile;
            //     })
            // );

            res.status(200).json(newTicket);
        } catch (err) {
            console.log(err, "error");
            sendErrorResponse(res, 500, err);
        }
    },

    updateActivity: async (req, res) => {
        try {
            const { activityId } = req.params;
            const {
                name,
                description,
                activityType,
                adultAgeLimit,
                childAgeLimit,
                infantAgeLimit,
                isCancelable,
                adultCost,
                childCost,
                infantCost,
                hourlyCost,
                isVat,
                vat,
                base,
                isSharedTransferAvailable,
                sharedTransferPrice,
                sharedTransferCost,
                isPrivateTransferAvailable,
                privateTransfers,
                isActive,
                peakTime,
                note,
                attraction,
                isPromoCode,
                promoCode,
                promoAmountAdult,
                promoAmountChild,
                isB2bPromoCode,
                b2bPromoCode,
                b2bPromoAmountAdult,
                b2bPromoAmountChild,
                oldImages,
                termsAndConditions,
                overview,
                inculsionsAndExclusions,
            } = req.body;

            const { _, error } = attractionActivitySchema.validate({
                ...req.body,
                privateTransfers: privateTransfers ? JSON.parse(privateTransfers) : [],
                oldImages: oldImages ? JSON.parse(oldImages) : [],
            });
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(activityId)) {
                return sendErrorResponse(res, 400, "Invalid activity id");
            }

            if (!isValidObjectId(attraction)) {
                return sendErrorResponse(res, 400, "invalid attraction id");
            }

            const attr = await Attraction.findOne({
                _id: attraction,
                isDeleted: false,
            });
            if (!attr) {
                return sendErrorResponse(res, 400, "attraction not found");
            }

            if (attr.bookingType === "ticket" && activityType === "transfer") {
                return sendErrorResponse(
                    res,
                    400,
                    "you can't add transfer only activity in ticket attraction"
                );
            }
            if (activityType === "transfer") {
                if (
                    isSharedTransferAvailable === "false" &&
                    isPrivateTransferAvailable === "false"
                ) {
                    return sendErrorResponse(
                        res,
                        400,
                        "shared or private transfer is required for transfer type"
                    );
                }
            }

            let parsedOldImages = [];
            if (oldImages) {
                parsedOldImages = JSON.parse(oldImages);
            }

            let images = [...parsedOldImages];
            if (req.files["images"]) {
                let image = req.files["images"];
                for (let i = 0; i < image.length; i++) {
                    const img = "/" + image[i]?.path?.replace(/\\/g, "/");
                    images.push(img);
                }
            }

            let parsedPrivateTransfers;
            if (privateTransfers) {
                parsedPrivateTransfers = JSON.parse(privateTransfers);
            }

            let isPriceRequired = true;
            let isCostRequired = true;
            if (activityType === "transfer") {
                isPriceRequired = false;
                isCostRequired = false;
            } else if (attr.bookingType === "ticket" && !attr.isApiConnected) {
                isCostRequired = false;
            }
            console.log("adultCost", adultCost);

            const activity = await AttractionActivity.findOneAndUpdate(
                {
                    isDeleted: false,
                    _id: activityId,
                },
                {
                    name,
                    activityType,
                    description,
                    adultAgeLimit,
                    childAgeLimit,
                    infantAgeLimit,
                    adultCost: base !== "hourly" || activityType !== "transfer" ? adultCost : null,
                    childCost: base !== "hourly" || activityType !== "transfer" ? childCost : null,
                    infantCost:
                        base !== "hourly" || activityType !== "transfer" ? infantCost : null,
                    hourlyCost:
                        base === "hourly" || activityType !== "transfer" ? hourlyCost : null,
                    isCancelable,
                    isVat,
                    vat: isVat && vat,
                    base,
                    isSharedTransferAvailable,
                    sharedTransferPrice: isSharedTransferAvailable && sharedTransferPrice,
                    sharedTransferCost: isSharedTransferAvailable && sharedTransferCost,
                    isActive,
                    peakTime,
                    note,
                    isPrivateTransferAvailable,
                    privateTransfers: isPrivateTransferAvailable ? parsedPrivateTransfers : [],
                    images: images,
                    isPromoCode,
                    promoCode: isPromoCode && promoCode,
                    promoAmountAdult: isPromoCode && promoAmountAdult,
                    promoAmountChild: isPromoCode && promoAmountChild,
                    isB2bPromoCode,
                    b2bPromoCode: isB2bPromoCode && b2bPromoCode,
                    b2bPromoAmountAdult: isB2bPromoCode && b2bPromoAmountAdult,
                    b2bPromoAmountChild: isB2bPromoCode && b2bPromoAmountChild,
                    termsAndConditions,
                    overview,
                    inculsionsAndExclusions,
                },
                { runValidators: true }
            );

            if (!activity) {
                return sendErrorResponse(res, 404, "Activity not found");
            }

            res.status(200).json({
                message: "Activity successfully updated",
                _id: activityId,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllAttractions: async (req, res) => {
        try {
            const { skip = 0, limit = 10, search } = req.query;

            const filters = { isDeleted: false };

            if (search && search !== "") {
                filters.title = { $regex: search, $options: "i" };
            }

            const attractions = await Attraction.aggregate([
                { $match: filters },
                {
                    $lookup: {
                        from: "destinations",
                        localField: "destination",
                        foreignField: "_id",
                        as: "destination",
                    },
                },
                {
                    $lookup: {
                        from: "attractionreviews",
                        localField: "_id",
                        foreignField: "attraction",
                        as: "reviews",
                    },
                },
                {
                    $lookup: {
                        from: "b2cattractionmarkups",
                        localField: "_id",
                        foreignField: "attraction",
                        as: "markup",
                    },
                },
                {
                    $set: {
                        totalRating: {
                            $sum: {
                                $map: {
                                    input: "$reviews",
                                    in: "$$this.rating",
                                },
                            },
                        },
                        totalReviews: {
                            $size: "$reviews",
                        },
                        destination: { $arrayElemAt: ["$destination", 0] },
                        markup: { $arrayElemAt: ["$markup", 0] },
                    },
                },
                {
                    $project: {
                        code: 1,
                        title: 1,
                        bookingType: 1,
                        isOffer: 1,
                        isApiConnected: 1,
                        offerAmountType: 1,
                        offerAmount: 1,
                        destination: 1,
                        totalReviews: 1,
                        averageRating: {
                            $cond: [
                                { $eq: ["$totalReviews", 0] },
                                0,
                                { $divide: ["$totalRating", "$totalReviews"] },
                            ],
                        },
                        createdAt: 1,
                        markup: 1,
                        isActive: true,
                        isB2cActive: 1,
                        isB2bActive: 1,
                    },
                },
                {
                    $sort: { createdAt: -1 },
                },
                {
                    $skip: Number(limit) * Number(skip),
                },
                {
                    $limit: Number(limit),
                },
            ]);

            const totalAttractions = await Attraction.find(filters).count();

            res.status(200).json({
                attractions,
                totalAttractions,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getInitialData: async (req, res) => {
        try {
            const categories = await AttractionCategory.find({});

            res.status(200).json({ categories });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleAttraction: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid attraction id");
            }

            const attraction = await Attraction.aggregate([
                { $match: { _id: Types.ObjectId(id), isDeleted: false } },
                {
                    $lookup: {
                        from: "attractionactivities",
                        let: { attractionId: "$_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$$attractionId", "$attraction"] },
                                            { $eq: ["$isDeleted", false] },
                                        ],
                                    },
                                },
                            },
                            {
                                $lookup: {
                                    from: "b2cattractionmarkups",
                                    localField: "_id",
                                    foreignField: "activityId",
                                    as: "markup",
                                },
                            },
                            {
                                $set: {
                                    markup: { $arrayElemAt: ["$markup", 0] },
                                },
                            },
                        ],
                        as: "activities",
                    },
                },
            ]);

            if (!attraction || attraction?.length < 1) {
                return sendErrorResponse(res, 404, "Attraction not found");
            }

            res.status(200).json(attraction[0]);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteAttraction: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid attraction id");
            }

            const attraction = await Attraction.findByIdAndUpdate(id, {
                isDeleted: true,
            });
            if (!attraction) {
                return sendErrorResponse(res, 400, "Attraction not found");
            }

            const activities = await AttractionActivity.find({ attraction: id });

            await Promise.all(
                activities.map(async (activity) => {
                    const promises = [];

                    promises.push(
                        MarkupProfile.updateMany(
                            {
                                "activities.activity": activity._id,
                            },
                            {
                                $pull: {
                                    activities: { activity: activity._id },
                                },
                            }
                        )
                    );

                    promises.push(
                        B2BMarkupProfile.updateMany(
                            {
                                "activities.activity": activity._id,
                            },
                            {
                                $pull: {
                                    activities: { activity: activity._id },
                                },
                            }
                        )
                    );

                    await Promise.all(promises);
                })
            );

            res.status(200).json({
                message: "Attraction successfully deleted",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleActivity: async (req, res) => {
        try {
            const { activityId } = req.params;

            if (!isValidObjectId(activityId)) {
                return sendErrorResponse(res, 400, "Invalid activity id");
            }

            const activity = await AttractionActivity.findOne({
                isDeleted: false,
                _id: activityId,
            }).populate("attraction", "title bookingType isApiConnected");

            if (!activity) {
                return sendErrorResponse(res, 404, "Activity not found");
            }

            res.status(200).json(activity);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateIsActiveActivity: async (req, res) => {
        try {
            const { activityId } = req.params;
            const { isActive, isB2bActive, isB2cActive } = req.body;

            if (!isValidObjectId(activityId)) {
                return sendErrorResponse(res, 400, "Invalid activity id");
            }

            const activity = await AttractionActivity.findOneAndUpdate(
                { _id: activityId, isDeleted: false },
                { isActive, isB2bActive, isB2cActive },
                { runValidators: true }
            );

            if (!activity) {
                return sendErrorResponse(res, 404, "Activity not found");
            }

            res.status(200).json({
                message: "Activity successfully deleted",
                isActive,
                isB2bActive,
                isB2cActive,
                _id: activityId,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteActivity: async (req, res) => {
        try {
            const { activityId } = req.params;

            if (!isValidObjectId(activityId)) {
                return sendErrorResponse(res, 400, "Invalid activity id");
            }

            const activity = await AttractionActivity.findOneAndUpdate(
                {
                    isDeleted: false,
                    _id: activityId,
                },
                { isDeleted: true }
            );

            if (!activity) {
                return sendErrorResponse(res, 404, "Activity not found");
            }

            res.status(200).json({
                message: "Activity successfully deleted",
                _id: activityId,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleAttractionBasicData: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid Attraction Id");
            }

            const attraction = await Attraction.findOne({
                isDeleted: false,
                _id: id,
            }).select("title bookingType");
            if (!attraction) {
                return sendErrorResponse(res, 404, "Attraction not found");
            }

            res.status(200).json(attraction);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateAttractionIsActiveOrNot: async (req, res) => {
        try {
            const { isActive, isB2bActive, isB2cActive } = req.body;
            const { id } = req.params;

            if (!isValidObjectId) {
                return sendErrorResponse(res, 400, "invalid attraction id");
            }

            const attraction = await Attraction.findOneAndUpdate(
                { _id: id, isDeleted: false },
                { isActive, isB2bActive, isB2cActive },
                { runValidators: true }
            );

            if (!attraction) {
                return sendErrorResponse(res, 404, "attraction not found or deleted.");
            }

            res.status(200).json({
                message: "attraction's status updated successfully",
                _id: id,
                isActive,
                isB2bActive,
                isB2cActive,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllAttractionAndActivitiesNames: async (req, res) => {
        try {
            const attractions = await Attraction.find({ isDeleted: false })
                .select({ title: 1, itineraryDescription: 1, images: 1 })
                .sort({ title: 1 });
            // .collation({ locale: "en", caseLevel: true });
            const activities = await AttractionActivity.find({
                isDeleted: false,
            })
                .select("name attraction")
                .sort({ name: 1 });
            // .collation({ locale: "en", caseLevel: true });

            res.status(200).json({ attractions, activities });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateSlug: async (req, res) => {
        try {
            // replace vehcile id

            let vehicleType = await VehicleType.find({ isDeleted: false });

            for (let i = 0; i < vehicleType.length; i++) {
                if (vehicleType[i]?.vehicleCategoryId?.toString() !== "654ca275c50ccbfd179b0bec") {
                    let vehicleTYpe = await VehicleType.findOneAndUpdate(
                        { _id: vehicleType[i]._id },
                        {
                            $set: {
                                vehicleCategoryId: "654c881b58cb77a1feabe6a6",
                            },
                        }
                    );
                }
            }
            // update trnsfer

            // let transfers = await Transfer.updateMany({}, { $set: { vehicleType: [] } });

            // update excursion
            // let activities = await Excursion.find({ isDeleted: false, isQuotation: true });

            // for (let i = 0; i < activities.length; i++) {
            //     console.log(i, activities[i], "kkkkk");
            //     if (activities[i].excursionType.toLowerCase() === "ticket") {
            //         let ticketPricing = await ExcursionTicketPricing.findOne({
            //             _id: activities[i].ticketPricing,
            //         });
            //         if (ticketPricing?.privateTransfer[0]?.vehicleType) {
            //             ticketPricing.privateTransfer[0].vehicleType =
            //                 await ticketPricing?.privateTransfer[0]?.vehicleType?.map((vt) => {
            //                     if (vt?.vehicle?.toString() === currentId?.toString()) {
            //                         console.log("call reached ");
            //                         return {
            //                             ...vt,
            //                             vehicle: replaceId,
            //                         };
            //                     }
            //                     return {
            //                         ...vt,
            //                     };
            //                 });
            //         }

            //         await ticketPricing.save();
            //     } else if (activities[i].excursionType.toLowerCase() === "transfer") {
            //         let ticketPricing = await ExcursionTransferPricing.findOne({
            //             _id: activities[i].transferPricing,
            //         });

            //         if (ticketPricing?.privateTransfer[0]?.vehicleType) {
            //             ticketPricing.privateTransfer[0].vehicleType =
            //                 ticketPricing?.privateTransfer[0]?.vehicleType?.map((vt) => {
            //                     if (vt?.vehicle?.toString() === currentId?.toString()) {
            //                         return {
            //                             ...vt,
            //                             vehicle: replaceId,
            //                         };
            //                     }
            //                     return {
            //                         ...vt,
            //                     };
            //                 });
            //         }

            //         await ticketPricing.save();
            //     }
            // }

            res.status(200).json({ messgae: "updated successfully" });
        } catch (err) {
            sendErrorResponse(res, 500, err);

            console.log(err);
        }
    },

    updateAllActivityProfiles: async (req, res) => {
        try {
            const { activityId } = req.params;

            const { markupUpdate } = req.body;

            if (!isValidObjectId(activityId)) {
                return sendErrorResponse(res, 400, "Invalid activity id");
            }

            const updatedProfiles = await Promise.all(
                markupUpdate.map(async (update) => {
                    const existingProfile = await MarkupProfile.findOne({ _id: update.profileId });

                    // Check if the activityId already exists in the activities array
                    const existingActivity = existingProfile.activities.find(
                        (activity) => activity?.activity?.toString() === activityId.toString()
                    );

                    if (existingActivity) {
                        // If the activityId exists, update the existing activity
                        const updatedProfile = await MarkupProfile.findOneAndUpdate(
                            {
                                _id: update.profileId,
                                "activities.activity": activityId,
                            },
                            {
                                $set: {
                                    "activities.$.markup": update.markup,
                                    "activities.$.markupType": update.markupType,
                                },
                            },
                            { new: true }
                        );
                        return updatedProfile;
                    } else {
                        // If the activityId doesn't exist, push a new activity
                        const updatedProfile = await MarkupProfile.findOneAndUpdate(
                            { _id: update.profileId },
                            {
                                $push: {
                                    activities: {
                                        activity: activityId,
                                        markup: update.markup,
                                        markupType: update.markupType,
                                    },
                                },
                            },
                            { new: true }
                        );
                        return updatedProfile;
                    }
                })
            );

            const updatedB2bProfiles = await Promise.all(
                markupUpdate.map(async (updateBb2) => {
                    const filter = {
                        selectedProfile: updateBb2.profileId,
                    };

                    const existingProfiles = await B2BMarkupProfile.find(filter);
                    const updates = existingProfiles.map(async (existingProfile) => {
                        const existingActivity = existingProfile.activities.find(
                            (activity) => activity.activity === activityId
                        );

                        if (existingActivity) {
                            // If the activityId exists, update the existing activity
                            return B2BMarkupProfile.updateOne(
                                {
                                    _id: existingProfile._id,
                                    "activities.activity": activityId,
                                },
                                {
                                    $set: {
                                        "activities.$.markup": updateBb2.markup,
                                        "activities.$.markupType": updateBb2.markupType,
                                    },
                                }
                            );
                        } else {
                            // If the activityId doesn't exist, push a new activity
                            return B2BMarkupProfile.updateOne(
                                { _id: existingProfile._id },
                                {
                                    $push: {
                                        activities: {
                                            activity: activityId,
                                            markup: updateBb2.markup,
                                            markupType: updateBb2.markupType,
                                        },
                                    },
                                }
                            );
                        }
                    });

                    return Promise.all(updates);
                })
            );

            // const updatedB2bProfiles = await Promise.all(
            //     markupUpdate.map(async (updateBb2) => {
            //         const updateProfile = await B2BMarkupProfile.updateMany(
            //             { selectedProfile: updateBb2.profileId },
            //             {
            //                 $push: {
            //                     activities: {
            //                         activity: newTicket._id,
            //                         markup: updateBb2.markup,
            //                         markupType: updateBb2.markupType,
            //                     },
            //                 },
            //             }
            //         );
            //         return updateProfile;
            //     })
            // );
            res.status(200).json({ messgae: "updated successfully" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateAllActivities: async (req, res) => {
        try {
            const activities = await AttractionActivity.find({ isDeleted: false });

            for (const activity of activities) {
                await AttractionActivity.findOneAndUpdate(
                    { _id: activity?._id },
                    { $set: { termsAndConditions: activity?.description } }
                );
            }

            res.status(200).json({ message: "updated successfully" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllAttractionDetails: async (req, res) => {
        try {
            const { search } = req.query;

            const filters = { isDeleted: false };

            if (search && search) {
                filters.title = { $regex: search, $options: "i" };
            }

            // const response = await Attraction.find(filters).lean()
            const response = await Attraction.aggregate([
                {
                    $match: filters,
                },
                {
                    $project: {
                        title: 1,
                        images: 1,
                    },
                },
            ]);

            res.status(200).json(response);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
