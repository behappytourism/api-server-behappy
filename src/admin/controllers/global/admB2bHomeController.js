const { isValidObjectId, Types } = require("mongoose");
const { B2BHomeSetting } = require("../../../b2b/models");
const { sendErrorResponse } = require("../../../helpers");

module.exports = {
    addNewHomeSection: async (req, res) => {
        try {
            const { title, description } = req.body;

            const b2bHomeSettings = new B2BHomeSetting({
                title,
                description,
            });

            await b2bHomeSettings.save();

            res.status(200).json(b2bHomeSettings);
        } catch (e) {
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

            const b2bHomeSettings = await B2BHomeSetting.findByIdAndUpdate(
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
        } catch (e) {
            sendErrorResponse(res, 500, err);
        }
    },

    listAllSections: async (req, res) => {
        try {
            const b2bHomeSettings = await B2BHomeSetting.find({ isDeleted: false });
            res.status(200).json(b2bHomeSettings || []);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteSection: async (req, res) => {
        try {
            const { id } = req.params;
            const b2bHomeSetting = await B2BHomeSetting.findByIdAndUpdate(
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
            const b2bHomeSettings = await B2BHomeSetting.findByIdAndUpdate(
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

            const b2bHomeSetting = await B2BHomeSetting.findOneAndUpdate(
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
            const b2bHomeSetting = await B2BHomeSetting.aggregate([
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
            const b2bHomeSetting = await B2BHomeSetting.findOneAndUpdate(
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
};
