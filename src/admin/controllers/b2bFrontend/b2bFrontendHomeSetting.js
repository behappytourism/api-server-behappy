const { isValidObjectId, Types } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { Attraction, B2bHomeSettings, B2BHomeSection } = require("../../../models");
const {
    homeFooterSettingsSchema,
    homeHeroSettingsSchema,
    homeCardSettingsSchema,
    homeMetaSettingsSchema,
    homeSectionsSettingsSchema,
} = require("../../validations/homeSettings.schema");

module.exports = {
    getLogo: async (req, res) => {
        try {
            const home = await B2bHomeSettings.findOne({ settingsNumber: 1 });

            if (!home) {
                return sendErrorResponse(res, 404, "Home not found");
            }

            res.status(200).json({ logo: home?.logo });
        } catch (err) {
            console.log(err);
        }
    },

    updateHomeLogo: async (req, res) => {
        try {
            if (!req.file?.path) {
                return sendErrorResponse(res, 400, "Logo is required");
            }

            let logoImg;
            if (req.file?.path) {
                logoImg = "/" + req.file.path.replace(/\\/g, "/");
            }

            const homeSettings = await B2bHomeSettings.findOneAndUpdate(
                { settingsNumber: 1 },
                {
                    logo: logoImg,
                },
                { runValidators: true, new: true, upsert: true }
            );

            res.status(200).json({ logo: homeSettings.logo });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    addHomeHeros: async (req, res) => {
        try {
            const { title, description, place } = req.body;

            const { _, error } = homeHeroSettingsSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!req.file) {
                return sendErrorResponse(res, 400, "Image is required");
            }

            let image;
            if (req.file?.path) {
                image = "/" + req.file.path.replace(/\\/g, "/");
            }

            const home = await B2bHomeSettings.findOneAndUpdate(
                { settingsNumber: 1 },
                {
                    $push: { heros: { title, description, image, place } },
                },
                { upsert: true, new: true, runValidators: true }
            );

            res.status(200).json(home.heros[home.heros?.length - 1]);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateHomeHero: async (req, res) => {
        try {
            const { heroId } = req.params;
            const { title, description, place } = req.body;

            const { _, error } = homeHeroSettingsSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(heroId)) {
                return sendErrorResponse(res, 400, "Invalid hero Id");
            }

            let image;
            if (req.file?.path) {
                image = "/" + req.file.path.replace(/\\/g, "/");
            }

            const home = await B2bHomeSettings.findOneAndUpdate(
                {
                    settingsNumber: 1,
                    "heros._id": heroId,
                },
                {
                    "heros.$.title": title,
                    "heros.$.description": description,
                    "heros.$.place": place,
                    "heros.$.image": image,
                },
                { new: true, runValidators: true }
            );

            if (!home) {
                return sendErrorResponse(res, 400, "Hero not found");
            }

            const objIndex = home.heros?.findIndex((hero) => {
                return hero?._id?.toString() === heroId?.toString();
            });

            res.status(200).json(home.heros[objIndex]);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteHomeHero: async (req, res) => {
        try {
            const { heroId } = req.params;

            if (!isValidObjectId(heroId)) {
                return sendErrorResponse(res, 400, "Invalid Hero Id");
            }

            const home = await B2bHomeSettings.findOneAndUpdate(
                { settingsNumber: 1, "heros._id": heroId },
                {
                    $pull: { heros: { _id: heroId } },
                },
                {
                    new: true,
                }
            );

            if (!home) {
                return sendErrorResponse(res, 404, "Hero not found");
            }

            res.status(200).json({
                message: "Hero successfully deleted",
                _id: heroId,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllCards: async (req, res) => {
        try {
            const home = await B2bHomeSettings.findOne({ settingsNumber: 1 });

            if (!home) {
                return sendErrorResponse(res, 404, "Home not found");
            }

            res.status(200).json({ cards: home?.cards });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    addHomeCard: async (req, res) => {
        try {
            const { title, description, tag, url, isRelativeUrl } = req.body;

            const { _, error } = homeCardSettingsSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 500, error.details[0].message);
            }

            if (!req.files?.backgroundImage || !req.files?.backgroundImage[0]?.path) {
                return sendErrorResponse(res, 400, "Background Image is required");
            }

            const backgroundImage = "/" + req.files?.backgroundImage[0]?.path.replace(/\\/g, "/");

            let icon;
            if (req.files?.icon && req.files?.icon[0]?.path) {
                icon = "/" + req.files?.icon[0]?.path.replace(/\\/g, "/");
            }

            const homeSettings = await B2bHomeSettings.findOneAndUpdate(
                {
                    settingsNumber: 1,
                },
                {
                    $push: {
                        cards: {
                            title,
                            backgroundImage,
                            description,
                            tag,
                            icon,
                            url,
                            isRelativeUrl,
                        },
                    },
                },
                { runValidators: true, new: true, upsert: true }
            ).lean();

            res.status(200).json({
                ...homeSettings.cards[homeSettings?.cards?.length - 1],
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateHomeCard: async (req, res) => {
        try {
            const { cardId } = req.params;
            const { title, description, tag, url, isRelativeUrl } = req.body;

            const { _, error } = homeCardSettingsSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 500, error.details[0].message);
            }

            if (!isValidObjectId(cardId)) {
                return sendErrorResponse(res, 400, "Invalid card id");
            }

            let backgroundImage;
            if (req.files?.backgroundImage && req.files?.backgroundImage[0]?.path) {
                backgroundImage = "/" + req.files?.backgroundImage[0]?.path.replace(/\\/g, "/");
            }

            let icon;
            if (req.files?.icon && req.files?.icon[0]?.path) {
                icon = "/" + req.files?.icon[0]?.path.replace(/\\/g, "/");
            }

            const homeSettings = await B2bHomeSettings.findOneAndUpdate(
                {
                    settingsNumber: 1,
                    "cards._id": cardId,
                },
                {
                    "cards.$.title": title,
                    "cards.$.description": description,
                    "cards.$.backgroundImage": backgroundImage,
                    "cards.$.tag": tag,
                    "cards.$.icon": icon,
                    "cards.$.url": url,
                    "cards.$.isRelativeUrl": isRelativeUrl,
                },
                { runValidators: true, new: true }
            );

            if (!homeSettings) {
                return sendErrorResponse(res, 404, "Home Settings not found");
            }

            res.status(200).json({ message: "Card successfully updated" });
        } catch (err) {
            sendErrorResponse(res, 400, err);
        }
    },

    deleteHomeCard: async (req, res) => {
        try {
            const { cardId } = req.params;

            if (!isValidObjectId(cardId)) {
                return sendErrorResponse(res, 400, "Invalid card id");
            }

            await B2bHomeSettings.findOneAndUpdate(
                { settingsNumber: 1 },
                {
                    $pull: { cards: { _id: cardId } },
                }
            );

            res.status(200).json({
                message: "Card successfully removed",
                _id: cardId,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateHomeFooter: async (req, res) => {
        try {
            const { footer } = req.body;

            const { _, error } = homeFooterSettingsSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const homeSettings = await B2bHomeSettings.findOneAndUpdate(
                { settingsNumber: 1 },
                { footer },
                { runValidators: true, new: true, upsert: true }
            ).lean();

            res.status(200).json({
                footer: homeSettings.footer[homeSettings.footer?.length - 1],
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    // deleteHomeFooter: async (req, res) => {
    //     try {
    //         const { id } = req.params;

    //         if (!isValidObjectId(id)) {
    //             return sendErrorResponse(res, 400, "Invalid footer id");
    //         }

    //         await HomeSettings.findOneAndUpdate(
    //             { settingsNumber: 1 },
    //             {
    //                 $pull: { footer: { _id: id } },
    //             }
    //         );

    //         res.status(200).json({
    //             message: "Footer successfully removed",
    //             _id: id,
    //         });
    //     } catch (err) {
    //         sendErrorResponse(res, 500, err);
    //     }
    // },

    updateMetaDetails: async (req, res) => {
        try {
            const {
                email,
                phoneNumber1,
                phoneNumber2,
                facebookUrl,
                instagramUrl,
                youtubeUrl,
                twitterUrl,
                tripAdvisorUrl,
                footerDescription,
                contactUs,
                copyRight,
            } = req.body;

            const { _, error } = homeMetaSettingsSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            await B2bHomeSettings.findOneAndUpdate(
                { settingsNumber: 1 },
                {
                    email,
                    phoneNumber1,
                    phoneNumber2,
                    facebookUrl,
                    instagramUrl,
                    youtubeUrl,
                    twitterUrl,
                    tripAdvisorUrl,
                    footerDescription,
                    copyRight,
                    contactUs,
                },
                { runValidators: true, new: true, upsert: true }
            );

            res.status(200).json({
                message: "Footer description successfully updated",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateHomeSections: async (req, res) => {
        try {
            const {
                isBestSellingAttractionsSectionEnabled,
                bestSellingAttractions,
                isTopAttractionsSectionEnabled,
                topAttractions,
                isBlogsEnabled,
            } = req.body;

            const { _, error } = homeSectionsSettingsSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            await B2bHomeSettings.findOneAndUpdate(
                { settingsNumber: 1 },
                {
                    isBestSellingAttractionsSectionEnabled,
                    bestSellingAttractions,
                    isTopAttractionsSectionEnabled,
                    topAttractions,
                    isBlogsEnabled,
                },
                { runValidators: true, new: true, upsert: true }
            );

            res.status(200).json({
                message: "Sections successfully updated",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getMetaDetails: async (req, res) => {
        try {
            const home = await B2bHomeSettings.findOne({
                settingsNumber: 1,
            });
            if (!home) {
                return sendErrorResponse(res, 404, "Home not found");
            }

            res.status(200).json({
                phoneNumber1: home?.phoneNumber1,
                phoneNumber2: home?.phoneNumber2,
                email: home?.email,
                facebookUrl: home?.facebookUrl,
                instagramUrl: home?.instagramUrl,
                youtubeUrl: home?.youtubeUrl,
                twitterUrl: home?.twitterUrl,
                tripAdvisorUrl: home?.tripAdvisorUrl,
                footerDescription: home?.footerDescription,
                contactUs: home?.contactUs,
                copyRight: home?.copyRight,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getFooter: async (req, res) => {
        try {
            const home = await B2bHomeSettings.findOne({
                settingsNumber: 1,
            });
            if (!home) {
                return sendErrorResponse(res, 400, "Home not found");
            }

            res.status(200).json({
                footer: home?.footer,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getHeros: async (req, res) => {
        try {
            const home = await B2bHomeSettings.findOne({
                settingsNumber: 1,
            });
            if (!home) {
                return sendErrorResponse(res, 400, "Home not found");
            }

            res.status(200).json({
                heros: home?.heros,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleCard: async (req, res) => {
        try {
            const { cardId } = req.params;

            if (!isValidObjectId(cardId)) {
                return sendErrorResponse(res, 400, "Invalid card Id");
            }

            const homeSettings = await B2bHomeSettings.findOne({
                settingsNumber: 1,
                "cards._id": cardId,
            });
            if (!homeSettings) {
                return sendErrorResponse(res, 404, "Card not found");
            }

            const filteredCards = homeSettings.cards.filter((item) => {
                return item?._id?.toString() === cardId?.toString();
            });

            res.status(200).json(filteredCards[0]);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSections: async (req, res) => {
        try {
            const home = await B2bHomeSettings.findOne({
                settingsNumber: 1,
            });

            const attractions = await Attraction.find({ isDeleted: false });

            if (!home) {
                return res.status(200).json({
                    isBestSellingAttractionsSectionEnabled: false,
                    bestSellingAttractions: [],
                    isTopAttractionsSectionEnabled: false,
                    topAttractions: [],
                    isBlogsEnabled: false,
                    attractions,
                });
            }

            const bestSellingAttractions = await Attraction.aggregate([
                {
                    $match: {
                        _id: { $in: home.bestSellingAttractions },
                    },
                },
                {
                    $project: {
                        title: 1,
                        images: 1,
                    },
                },
            ]);

            const topAttractions = await Attraction.aggregate([
                {
                    $match: {
                        _id: { $in: home.topAttractions },
                    },
                },
                {
                    $project: {
                        title: 1,
                        images: 1,
                    },
                },
            ]);

            res.status(200).json({
                isBestSellingAttractionsSectionEnabled: home.isBestSellingAttractionsSectionEnabled,
                bestSellingAttractions,
                isTopAttractionsSectionEnabled: home.isTopAttractionsSectionEnabled,
                topAttractions,
                isBlogsEnabled: home.isBlogsEnabled,
                attractions,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    addNewHomeSection: async (req, res) => {
        try {
            const { title, description } = req.body;

            const b2bHomeSettings = new B2BHomeSection({
                title,
                description,
            });

            await b2bHomeSettings.save();

            res.status(200).json(b2bHomeSettings);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    editHomeSection: async (req, res) => {
        try {
            const { title, description } = req.body;
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid category id!");
            }

            const b2bHomeSettings = await B2BHomeSection.findByIdAndUpdate(
                id,
                {
                    title,
                    description,
                },
                { runValidators: true, new: true }
            );

            if (!b2bHomeSettings) {
                return sendErrorResponse(res, 404, "home settings not found!");
            }

            res.status(200).json(b2bHomeSettings);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    listAllSections: async (req, res) => {
        try {
            const b2bHomeSettings = await B2BHomeSection.find({ isDeleted: false });
            res.status(200).json(b2bHomeSettings || []);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteSection: async (req, res) => {
        try {
            const { id } = req.params;
            const b2bHomeSetting = await B2BHomeSection.findByIdAndUpdate(
                id,
                {
                    isDeleted: true,
                },
                { runValidators: true, new: true }
            );
            res.status(200).json({
                _id: b2bHomeSetting._id,
                message: "section deleted successfully",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    addNewBanner: async (req, res) => {
        try {
            const { title, description, link } = req.body;
            const { id, bannerId } = req.params;

            if (!req.file?.path) {
                return sendErrorResponse(res, 400, "image  required");
            }

            let image;
            if (req.file?.path) {
                image = "/" + req.file.path.replace(/\\/g, "/");
            }
            const b2bHomeSettings = await B2BHomeSection.findByIdAndUpdate(
                id,
                {
                    $push: {
                        banners: {
                            title,
                            description,
                            image,
                            link,
                        },
                    },
                },
                { runValidators: true, new: true }
            );
            const newlyAddedBanner = b2bHomeSettings.banners[b2bHomeSettings.banners.length - 1];

            res.status(200).json(newlyAddedBanner);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    editBanner: async (req, res) => {
        try {
            const { id, bannerId } = req.params;
            const { title, description, link } = req.body;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid category id!");
            }

            let image;
            if (req.file?.path) {
                image = "/" + req.file.path.replace(/\\/g, "/");
            }

            const b2bHomeSet = await B2BHomeSection.findOne({
                _id: id,
                // "banners._id": bannerId,
            });

            const b2bHomeSetting = await B2BHomeSection.findOneAndUpdate(
                { _id: id, "banners._id": bannerId },
                {
                    $set: {
                        "banners.$.title": title,
                        "banners.$.description": description,
                        "banners.$.link": link,
                        "banners.$.image": image,
                    },
                },
                { new: true }
            );

            if (!b2bHomeSetting) {
                return sendErrorResponse(res, 404, "home settings not found!");
            }

            const updatedBannerIndex = b2bHomeSetting.banners.findIndex(
                (banner) => banner._id.toString() === bannerId
            );

            const updatedBanner = b2bHomeSetting.banners[updatedBannerIndex];

            res.status(200).json(updatedBanner);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    listAllSectionBanners: async (req, res) => {
        try {
            const { id } = req.params;
            const b2bHomeSetting = await B2BHomeSection.aggregate([
                {
                    $match: {
                        _id: Types.ObjectId(id), // Convert id to ObjectId if needed
                        isDeleted: false,
                    },
                },
                {
                    $project: {
                        banners: {
                            $filter: {
                                input: "$banners",
                                as: "banner",
                                cond: { $eq: ["$$banner.isDeleted", false] },
                            },
                        },
                    },
                },
            ]);
            if (!b2bHomeSetting) {
                return sendErrorResponse(res, 404, "home settings not found!");
            }

            res.status(200).json(b2bHomeSetting[0]?.banners || []);
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    deleteBannerSection: async (req, res) => {
        try {
            const { id, bannerId } = req.params;
            const b2bHomeSetting = await B2BHomeSection.findOneAndUpdate(
                { _id: id, "banners._id": bannerId },
                {
                    $set: {
                        "banners.$.isDeleted": true,
                    },
                },
                { new: true }
            );
            res.status(200).json({
                _id: b2bHomeSetting._id,
                bannerId: bannerId,
                message: "banner deleted successfully",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    upsertB2bSettings: async (req, res) => {
        const { termsAndConditions, privacyAndPolicy } = req.body;
        console.log(privacyAndPolicy, "privacyAndPolicy");
        try {
            // Find the existing document or create a new one
            const b2bTermsAndConditions = await B2bHomeSettings.findOneAndUpdate(
                { settingsNumber: 1 },
                {
                    $set: {
                        termsAndConditions: termsAndConditions,
                        privacyAndPolicy: privacyAndPolicy,
                    },
                },
                { upsert: true, new: true }
            );

            res.status(200).json(b2bTermsAndConditions);
        } catch (error) {
            // Handle any errors
            console.error(error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    },

    getFrontendSettings: async (req, res) => {
        try {
            let b2bSettings = await B2bHomeSettings.findOne({ settingsNumber: 1 });

            if (!b2bSettings) {
                return sendErrorResponse(res, 400, " Settings not added ");
            }

            res.status(200).json(b2bSettings);
        } catch (error) {
            res.status(500).json({ error: "Internal Server Error" });
        }
    },

    upsertAboutUs: async (req, res) => {
        const { aboutUs } = req.body;
        try {
            // Find the existing document or create a new one
            const b2bTermsAndConditions = await B2bHomeSettings.findOneAndUpdate(
                { settingsNumber: 1 },
                {
                    $set: {
                        aboutUs: aboutUs,
                    },
                },
                { upsert: true, new: true }
            );

            res.status(200).json(b2bTermsAndConditions);
        } catch (error) {
            // Handle any errors
            console.error(error);
            res.status(500).json({ error: "Internal Server Error" });
        }
    },

    getAboutUs: async (req, res) => {
        try {
            let b2bSettings = await B2bHomeSettings.findOne({ settingsNumber: 1 });

            if (!b2bSettings) {
                return sendErrorResponse(res, 400, " Settings not added ");
            }

            res.status(200).json({ aboutUs: b2bSettings?.aboutUs });
        } catch (error) {
            res.status(500).json({ error: "Internal Server Error" });
        }
    },
};
