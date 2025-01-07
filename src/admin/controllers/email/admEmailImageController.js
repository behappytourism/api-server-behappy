const { sendErrorResponse } = require("../../../helpers");
const { isValidObjectId } = require("mongoose");
const { EmailImage } = require("../../../models");

module.exports = {
    addNewEmailImage: async (req, res) => {
        try {
            const { name } = req.body;

            let image;
            if (!req.file?.path) {
                return sendErrorResponse(res, 400, "file is required");
            } else {
                image = "/" + req.file.path.replace(/\\/g, "/");
            }

            if (!name) {
                return sendErrorResponse(res, 400, "name is required");
            }

            const emailImage = new EmailImage({
                name,
                image,
            });

            await emailImage.save();
            res.status(200).json(emailImage);
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    updateEmailImage: async (req, res) => {
        try {
            const { id } = req.params;

            const { name } = req.body;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid airline id");
            }

            let image;
            console.log(req.file?.path, "req.file?.path");
            if (!req.file?.path) {
                return sendErrorResponse(res, 400, "file is required");
            } else {
                image = "/" + req.file.path.replace(/\\/g, "/");
            }

            if (!name) {
                return sendErrorResponse(res, 400, "name is required");
            }

            const emailImage = await EmailImage.findOneAndUpdate(
                { _id: id, isDeleted: false },
                {
                    name,
                    image,
                },
                { new: true, runValidators: true }
            );
            if (!emailImage) {
                return sendErrorResponse(res, 404, "email image not found");
            }

            res.status(200).json(emailImage);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteEmailImage: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid email image id");
            }

            const emailImage = await EmailImage.findOneAndDelete({
                _id: id,
                isDeleted: false,
            });
            if (!emailImage) {
                return sendErrorResponse(res, 404, "email image not found");
            }

            res.status(200).json({
                message: "email image successfully deleted",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllEmailImage: async (req, res) => {
        try {
            const { skip = 0, limit = 10, searchQuery } = req.query;

            const filters = { isDeleted: false };

            if (searchQuery && searchQuery !== "") {
                filters.name = { $regex: searchQuery, $options: "i" };
            }

            const emailImages = await EmailImage.find(filters)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalEmailImages = await EmailImage.findOne(filters).count();

            res.status(200).json({
                emailImages,
                totalEmailImages,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleEmailImage: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid airline id");
            }

            const emailImage = await EmailImage.findOne({
                _id: id,
                isDeleted: false,
            });
            if (!emailImage) {
                return sendErrorResponse(res, 404, "email list not found");
            }

            res.status(200).json(emailImage);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getEmailImages: async (req, res) => {
        try {
            const filters = { isDeleted: false };

            const emailImages = await EmailImage.find(filters)
                .sort({ createdAt: -1 })
                .select({
                    _id: 1,
                    name: 1,
                    image: { $concat: [process.env.SERVER_URL, "$image"] },
                })
                .lean();

            res.status(200).json(emailImages || []);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
