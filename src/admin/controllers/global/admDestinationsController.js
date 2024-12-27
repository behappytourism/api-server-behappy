const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { Destination, Country } = require("../../../models");
const SeoSetting = require("../../../models/seo/seoSetting.model");
const { destinationSchema } = require("../../validations/destination.schema");

module.exports = {
    getAllDestinations: async (req, res) => {
        try {
            const { skip = 0, limit = 10 } = req.query;

            const destinations = await Destination.find({ isDeleted: false })
                .populate("country")
                .sort({ _id: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalDestinations = await Destination.find({
                isDeleted: false,
            }).count();

            res.status(200).json({
                destinations,
                totalDestinations,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    addNewDestination: async (req, res) => {
        try {
            const { country, name, code } = req.body;

            const { _, error } = destinationSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const exDestination = await Destination.findOne({
                isDeleted: false,
                code: code?.toUpperCase(),
            }).lean();
            if (exDestination) {
                return sendErrorResponse(res, 400, "destination code already exists");
            }

            if (!isValidObjectId(country)) {
                return sendErrorResponse(res, 400, "Invalid country id");
            }
            const countryDetails = await Country.findOne({
                _id: country,
                isDeleted: false,
            });
            if (!countryDetails) {
                return sendErrorResponse(res, 404, "Country not found");
            }

            if (!req.file?.path) {
                return sendErrorResponse(res, 400, "Image is required");
            }

            let image;
            if (req.file?.path) {
                image = "/" + req.file.path.replace(/\\/g, "/");
            }

            const newDestination = new Destination({
                country,
                name,
                image,
                code,
            });
            await newDestination.save();

            const destinationObj = await Object(newDestination);
            destinationObj.country = countryDetails;

            res.status(200).json(destinationObj);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateDestination: async (req, res) => {
        try {
            const { id } = req.params;
            const { country, name, code } = req.body;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid destination id");
            }

            console.log(code, "code");
            if (code) {
                const exDestination = await Destination.findOne({
                    isDeleted: false,
                    code: code?.toUpperCase(),
                    _id: { $ne: id },
                }).lean();
                console.log(exDestination);
                if (exDestination) {
                    return sendErrorResponse(res, 400, "destination code already exists");
                }
            }

            if (!isValidObjectId(country)) {
                return sendErrorResponse(res, 400, "Invalid country Id");
            }
            const countryDetails = await Country.findOne({
                _id: country,
                isDeleted: false,
            });
            if (!countryDetails) {
                return sendErrorResponse(res, 404, "Country not found");
            }

            let image;
            if (req.file?.path) {
                image = "/" + req.file.path.replace(/\\/g, "/");
            }

            const destination = await Destination.findOneAndUpdate(
                {
                    _id: id,
                    isDeleted: false,
                },
                { country, name, image, code },
                { runValidators: true, new: true }
            );
            if (!destination) {
                return sendErrorResponse(res, 404, "Destination not found");
            }

            const destinationObj = Object(destination);
            destinationObj.country = countryDetails;

            res.status(200).json(destinationObj);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteDestination: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid destination Id");
            }

            const destination = await Destination.findOneAndDelete({
                _id: id,
                isDeleted: false,
            });
            if (!destination) {
                return sendErrorResponse(res, 404, "Destination not found");
            }

            res.status(200).json({
                message: "Destination successfully deleted",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateDestinationSlug: async (req, res) => {
        try {
            const { id } = req.params;
            const { slug } = req.body;

            if (!slug) {
                return sendErrorResponse(res, 400, "slug not added");
            }

            const existingSlug = await Destination.findOne({ slug: slug });

            if (existingSlug) {
                return sendErrorResponse(res, 400, "other slug already has this name ");
            }

            const destination = await Destination.findOne({ _id: id, isDeleted: false }).populate(
                "country"
            );
            if (!destination) {
                return sendErrorResponse(res, 400, "destination not found");
            }

            const seo = await SeoSetting.findOneAndUpdate(
                {
                    seoType: "products",
                    "seoCategory.name": "attraction",
                    "seoCategory.seoSubCategory.slug": destination.slug,
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
                        { "subCategory.slug": destination.slug },
                    ],
                }
            );

            destination.slug = slug;
            await destination.save();

            res.status(200).json(destination);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
