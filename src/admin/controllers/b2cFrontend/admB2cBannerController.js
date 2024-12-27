const { sendErrorResponse } = require("../../../helpers");
const { B2cBanner } = require("../../../models");
const { isValidObjectId } = require("mongoose");

module.exports = {
    addBanner: async (req, res) => {
        try {
            const { name, banners } = req.body;

            const newBanner = await B2cBanner({
                name,
            });

            await newBanner.save();

            res.status(200).json(newBanner);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllBannerNames: async (req, res) => {
        try {
            const bannerNames = await B2cBanner.find({}).select("name");

            res.status(200).json(bannerNames);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
    getSingleBanner: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid  id");
            }
            const banner = await B2cBanner.findOne({ _id: id });
            if (!isValidObjectId(banner)) {
                return sendErrorResponse(res, 400, "banner not found");
            }
            res.status(200).json(banner);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    addSingleBanner: async (req, res) => {
        try {
            const { id } = req.params;
            const { title, body, imageUrl, isButton, buttonText, buttonUrl } = req.body;
            if (!req.file?.path) {
                return sendErrorResponse(res, 400, "Category Icon required");
            }

            let image;
            if (req.file?.path) {
                image = "/" + req.file.path.replace(/\\/g, "/");
            }


            const banner = await B2cBanner.findOneAndUpdate(
                { _id: id },
                {
                    $push: {
                        banners: {
                            title: title,
                            body: body,
                            image: image,
                            isButton: isButton,
                            buttonText: buttonText,
                            buttonUrl: buttonUrl,
                        },
                    },
                },
                { new: true }
            );

            console.log(banner);

            res.status(200).json({ banners: banner.banners || [] });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
    editSingleBanner: async (req, res) => {
        try {
            const { id, bannerId } = req.params;
            const { title, body, imageUrl, isButton, buttonText, buttonUrl } = req.body;

            let image;
            if (req.file?.path) {
                image = "/" + req.file.path.replace(/\\/g, "/");
            }

            const banner = await B2cBanner.findOneAndUpdate(
                { _id: id, "banners._id": bannerId },
                {
                    $set: {
                        "banners.$.title": title,
                        "banners.$.body": body,
                        "banners.$.image": image,
                        "banners.$.isButton": isButton,
                        "banners.$.buttonText": buttonText,
                        "banners.$.buttonUrl": buttonUrl,
                    },
                },
                { new: true }
            );

            res.status(200).json({ banners: banner.banners || [] });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteBanner: async (req, res) => {
        try {
            const { id, bannerId } = req.params;

            const banner = await B2cBanner.findOneAndUpdate(
                { _id: id },
                {
                    $pull: { banners: { _id: bannerId } },
                }
            );

            if (!banner) {
                return sendErrorResponse(res, 400, "banner not found");
            }
            res.status(200).json({ message: "banner not found " });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
