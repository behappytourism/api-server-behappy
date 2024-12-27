const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { B2CAttractionMarkup, Attraction, AttractionActivity } = require("../../../models");
const { b2cAttractionMarkupSchema } = require("../../validations/b2cAttractionMarkup.schema");

module.exports = {
    upsertB2cAttractionMarkup: async (req, res) => {
        try {
            const {
                adultMarkupType,
                adultMarkup,
                childMarkup,
                childMarkupType,
                infantMarkup,
                infantMarkupType,
                activityId,
            } = req.body;

            console.log(req.body, "body: ");

            const { _, error } = b2cAttractionMarkupSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(activityId)) {
                return sendErrorResponse(res, 400, "Invalid attraction id");
            }

            const activityDetail = await AttractionActivity.findOne({
                _id: activityId,
                isDeleted: false,
            });
            if (!activityDetail) {
                return sendErrorResponse(res);
            }

            const b2cAttractionMarkup = await B2CAttractionMarkup.findOneAndUpdate(
                {
                    activityId,
                },
                {
                    activityId,
                    adultMarkupType,
                    adultMarkup,
                    childMarkup,
                    childMarkupType,
                    infantMarkup,
                    infantMarkupType,
                },
                { upsert: true, new: true, runValidators: true }
            );

            let tempObj = Object(b2cAttractionMarkup);
            tempObj.attraction = {
                _id: activityDetail?._id,
                title: activityDetail?.name,
            };

            res.status(200).json(tempObj);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteB2cAttractionMarkup: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid markup id");
            }

            const b2cAttractionMarkup = await B2CAttractionMarkup.findByIdAndDelete(id);

            if (!b2cAttractionMarkup) {
                return sendErrorResponse(res, 404, "B2C Attraction markup not found");
            }

            res.status(200).json({
                message: "b2c attraction markup deleted successfully",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllB2cAttractionMarkups: async (req, res) => {
        try {
            const { skip = 0, limit = 10 } = req.query;

            const b2cAttractionMarkups = await B2CAttractionMarkup.find({})
                .populate("attraction", "title")
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            res.status(200).json({
                b2cAttractionMarkups,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 400, err);
        }
    },
};
