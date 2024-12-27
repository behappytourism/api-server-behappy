const { isValidObjectId } = require("mongoose");
const { sendErrorResponse } = require("../../../helpers");
const { Attraction, AttractionReview } = require("../../../models");

const {
    admAttractionReviewSchema,
} = require("../../validations/attraction/attractionReview.schema");

module.exports = {
    addAttractionReview: async (req, res) => {
        try {
            const { title, description, rating, attraction, userName } = req.body;

            const { _, error } = admAttractionReviewSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(attraction)) {
                return sendErrorResponse(res, 400, "Invalid attraction id");
            }

            const attractionDetails = await Attraction.findById(attraction);
            if (!attractionDetails) {
                return sendErrorResponse(res, 404, "Attraction not found");
            }

            let image;
            if (req.file?.path) {
                image = "/" + req.file.path.replace(/\\/g, "/");
            }

            const newAttractionReview = new AttractionReview({
                title,
                description,
                rating,
                attraction,
                createdBy: "admin",
                userName,
                image,
            });
            await newAttractionReview.save();

            res.status(200).json(newAttractionReview);
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    editAttractionReview: async (req, res) => {
        try {
            const { reviewId } = req.params;
            const { title, description, rating, attraction, userName } = req.body;

            const { _, error } = admAttractionReviewSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(attraction)) {
                return sendErrorResponse(res, 400, "Invalid attraction id");
            }

            const attractionDetails = await Attraction.findById(attraction);
            if (!attractionDetails) {
                return sendErrorResponse(res, 404, "Attraction not found");
            }

            let image;
            if (req.file?.path) {
                image = "/" + req.file.path.replace(/\\/g, "/");
            }
            console.log(reviewId, "reviewId");

            const attractionReview = await AttractionReview.findOneAndUpdate(
                { _id: reviewId },
                {
                    ...req.body,
                    image,
                },
                { runValidators: true }
            );

            if (!attractionReview) {
                return sendErrorResponse(res, 404, "Review not found");
            }

            res.status(200).json(attractionReview);
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleAttractionReviews: async (req, res) => {
        try {
            const { id } = req.params;
            const { skip = 0, limit = 10 } = req.query;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid attraction id");
            }

            const attraction = await Attraction.findById(id).select("title");
            if (!attraction) {
                return sendErrorResponse(res, 404, "Attraction not found");
            }

            const attractionReviews = await AttractionReview.find({
                attraction: id,
            })
                .populate("user", "name avatar email")
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalAttractionReviews = await AttractionReview.find({
                attraction: id,
            }).count();

            res.status(200).json({
                attractionReviews,
                attraction,
                totalAttractionReviews,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteAttractionReview: async (req, res) => {
        try {
            const { reviewId } = req.params;

            if (!isValidObjectId(reviewId)) {
                return sendErrorResponse(res, 400, "Invalid Review Id");
            }

            const review = await AttractionReview.findByIdAndDelete(reviewId);

            if (!review) {
                return sendErrorResponse(res, 404, "Review not found");
            }

            res.status(200).json({
                message: "Review successfully deleted",
                reviewId,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleReview: async (req, res) => {
        try {
            const { reviewId } = req.params;

            const review = await AttractionReview.findById(reviewId);

            if (!review) {
                return sendErrorResponse(res, 404, "Review not found");
            }

            res.status(200).json(review);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
