const { isValidObjectId } = require("mongoose");
const {
    Reseller,
    B2BSpecialVisaMarkup,
    B2BSpecialAttractionMarkup,
    B2BSpecialA2aMarkup,
    B2BA2a,
} = require("../../../b2b/models");

const { sendErrorResponse } = require("../../../helpers");
const { AttractionActivity, VisaType } = require("../../../models");
const { b2bSpecialMarkupSchema } = require("../../validations/b2bSpecialMarkupSchema");

module.exports = {
    upsertB2bAttractionMarkup: async (req, res) => {
        try {
            const { markupType, markup, resellerId, activityId } = req.body;

            const { _, error } = b2bSpecialMarkupSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(resellerId)) {
                return sendErrorResponse(res, 400, "Invalid reseller id");
            }

            if (!isValidObjectId(activityId)) {
                return sendErrorResponse(res, 400, "Invalid activity id");
            }

            const reseller = await Reseller.findOne({
                _id: resellerId,
                isDeleted: false,
            });
            if (!reseller) {
                return sendErrorResponse(res, 400, "Invalid reseller id");
            }

            const activity = await AttractionActivity.findOne({
                _id: activityId,
                isDeleted: false,
            });
            if (!activity) {
                return sendErrorResponse(res, 400, "Invalid activity id");
            }

            const b2bAttractionSpecialMarkup = await B2BSpecialAttractionMarkup.findOneAndUpdate(
                {
                    resellerId: reseller._id,
                    activityId: activity._id,
                },
                {
                    markupType,
                    markup,
                },
                { upsert: true, new: true }
            );

            let tempObj = Object(b2bAttractionSpecialMarkup);
            tempObj.attraction = {
                _id: b2bAttractionSpecialMarkup?._id,
                markup: b2bAttractionSpecialMarkup?.markup,
                markupType: b2bAttractionSpecialMarkup?.markupType,
            };

            res.status(200).json(tempObj);
        } catch (err) {
            console.log(err, "error");
            sendErrorResponse(res, 500, err);
        }
    },

    updateB2bAttractionMarkup: async (req, res) => {
        try {
            const markupArray = req.body;

            // Validate the request body
            if (!Array.isArray(markupArray)) {
                return res.status(400).json({ message: "Invalid request body" });
            }

            // Update each document in the array
            const promises = markupArray.map(async (markupObj) => {
                const { resellerId, activityId, markupType, markup } = markupObj;

                // Check if the reseller and activity exist and are not deleted
                const reseller = await Reseller.findOne({
                    _id: resellerId,
                    isDeleted: false,
                });
                if (!reseller) {
                    throw new Error(`Invalid reseller id ${resellerId}`);
                }

                const activity = await AttractionActivity.findOne({
                    _id: activityId,
                    isDeleted: false,
                });
                if (!activity) {
                    throw new Error(`Invalid activity id ${activityId}`);
                }

                // Update or insert the document
                return B2BSpecialAttractionMarkup.findOneAndUpdate(
                    { resellerId, activityId },
                    { markupType, markup },
                    { upsert: true, new: true }
                );
            });

            // Wait for all updates to complete and return the results
            const results = await Promise.all(promises);
            const response = results.map((markupDoc) => {
                const tempObj = Object(markupDoc);
                tempObj.attraction = {
                    _id: markupDoc?._id,
                    markup: markupDoc?.markup,
                    markupType: markupDoc?.markupType,
                };
                return tempObj;
            });

            res.status(200).json(response);
        } catch (err) {
            console.log(err, "error");
            res.status(500).json({ message: err.message });
        }
    },

    updateB2bAtoaMarkup: async (req, res) => {
        try {
            const markupArray = req.body;

            // Validate the request body
            if (!Array.isArray(markupArray)) {
                return res.status(400).json({ message: "Invalid request body" });
            }

            // Update each document in the array
            const promises = markupArray.map(async (markupObj) => {
                const { resellerId, atoaId, markupType, markup } = markupObj;

                // Check if the reseller and activity exist and are not deleted
                const reseller = await Reseller.findOne({
                    _id: resellerId,
                    isDeleted: false,
                });
                if (!reseller) {
                    throw new Error(`Invalid reseller id ${resellerId}`);
                }

                const activity = await B2BA2a.findOne({
                    _id: atoaId,
                    isDeleted: false,
                });
                if (!activity) {
                    throw new Error(`Invalid activity id ${atoaId}`);
                }

                // Update or insert the document
                return B2BSpecialA2aMarkup.findOneAndUpdate(
                    { resellerId, atoaId },
                    { markupType, markup },
                    { upsert: true, new: true }
                );
            });

            // Wait for all updates to complete and return the results
            const results = await Promise.all(promises);
            const response = results.map((markupDoc) => {
                const tempObj = Object(markupDoc);
                tempObj.attraction = {
                    _id: markupDoc?._id,
                    markup: markupDoc?.markup,
                    markupType: markupDoc?.markupType,
                };
                return tempObj;
            });

            res.status(200).json(response);
        } catch (err) {
            console.log(err, "error");
            res.status(500).json({ message: err.message });
        }
    },

    updateB2bVisaMarkup: async (req, res) => {
        try {
            const markupArray = req.body;

            // Validate the request body
            if (!Array.isArray(markupArray)) {
                return res.status(400).json({ message: "Invalid request body" });
            }

            // Update each document in the array
            const promises = markupArray.map(async (markupObj) => {
                const { resellerId, visaTypeId, markupType, markup } = markupObj;

                // Check if the reseller and visa type exist and are not deleted
                const reseller = await Reseller.findOne({
                    _id: resellerId,
                    isDeleted: false,
                });
                if (!reseller) {
                    throw new Error(`Invalid reseller id ${resellerId}`);
                }

                const visaType = await VisaType.findOne({
                    _id: visaTypeId,
                    isDeleted: false,
                });
                if (!visaType) {
                    throw new Error(`Invalid visa type id ${visaTypeId}`);
                }

                // Update or insert the document
                return B2BSpecialVisaMarkup.findOneAndUpdate(
                    { resellerId, visaTypeId },
                    { markupType, markup },
                    { upsert: true, new: true }
                );
            });

            // Wait for all updates to complete and return the results
            const results = await Promise.all(promises);
            const response = results.map((markupDoc) => {
                const tempObj = Object(markupDoc);
                tempObj.visa = {
                    _id: markupDoc?._id,
                    markup: markupDoc?.markup,
                    markupType: markupDoc?.markupType,
                };
                return tempObj;
            });

            res.status(200).json(response);
        } catch (err) {
            console.log(err, "error");
            res.status(500).json({ message: err.message });
        }
    },

    listSpecialMarkup: async (req, res) => {
        try {
            const { resellerId } = req.params;
            console.log(resellerId);

            if (!isValidObjectId(resellerId)) {
                return sendErrorResponse(res, 400, "Invalid reseller id");
            }

            const attractionMarkup = await B2BSpecialAttractionMarkup.findOne({
                resellerId: resellerId,
            });

            const visaMarkup = await B2BSpecialVisaMarkup.findOne({
                resellerId: resellerId,
            });

            const a2aMarkup = await B2BSpecialA2aMarkup.findOne({
                resellerId: resellerId,
            });

            res.status(200).json({
                attractionMarkup: attractionMarkup,
                visaMarkup: visaMarkup,
                a2aMarkup: a2aMarkup,
            });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    upsertB2bVisaMarkup: async (req, res) => {
        try {
            const { markupType, markup, resellerId } = req.body;

            const { _, error } = b2bSpecialMarkupSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(resellerId)) {
                return sendErrorResponse(res, 400, "Invalid reseller id");
            }

            const reseller = await Reseller.findOne({
                _id: resellerId,
                isDeleted: false,
            });
            if (!reseller) {
                return sendErrorResponse(res, 400, "Invalid reseller id");
            }

            console.log(reseller, "reseller");

            console.log(resellerId);

            const b2bVisaSpecialMarkup = await B2BSpecialVisaMarkup.findOneAndUpdate(
                {
                    resellerId: reseller._id,
                },
                {
                    markupType,
                    markup,
                },
                { upsert: true, new: true }
            );

            console.log(b2bVisaSpecialMarkup, "b2bAttractionSpecialMarkup");

            let tempObj = Object(b2bVisaSpecialMarkup);
            tempObj.visa = {
                _id: b2bVisaSpecialMarkup?._id,
                markup: b2bVisaSpecialMarkup?.markup,
                markupType: b2bVisaSpecialMarkup?.markupType,
            };

            res.status(200).json(tempObj);
        } catch (err) {
            console.log(err, "error");
            sendErrorResponse(res, 500, err);
        }
    },

    listVisaSpecialMarkup: async (req, res) => {
        try {
            const { resellerId } = req.params;
            console.log(resellerId);

            if (!isValidObjectId(resellerId)) {
                return sendErrorResponse(res, 400, "Invalid reseller id");
            }

            const markup = await B2BSpecialVisaMarkup.findOne({
                resellerId: resellerId,
            });
            if (!markup) {
                return sendErrorResponse(res, 400, "No special visa  markup found");
            }

            res.status(200).json(markup);
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    upsertB2bA2aMarkup: async (req, res) => {
        try {
            const { markupType, markup, resellerId } = req.body;

            const { _, error } = b2bSpecialMarkupSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(resellerId)) {
                return sendErrorResponse(res, 400, "Invalid reseller id");
            }

            const reseller = await Reseller.findOne({
                _id: resellerId,
                isDeleted: false,
            });
            if (!reseller) {
                return sendErrorResponse(res, 400, "Invalid reseller id");
            }

            console.log(reseller, "reseller");

            console.log(resellerId);

            const b2bA2aSpecialMarkup = await B2BSpecialA2aMarkup.findOneAndUpdate(
                {
                    resellerId: reseller._id,
                },
                {
                    markupType,
                    markup,
                },
                { upsert: true, new: true }
            );

            console.log(b2bA2aSpecialMarkup, "b2bAttractionSpecialMarkup");

            let tempObj = Object(b2bA2aSpecialMarkup);
            tempObj.visa = {
                _id: b2bA2aSpecialMarkup?._id,
                markup: b2bA2aSpecialMarkup?.markup,
                markupType: b2bA2aSpecialMarkup?.markupType,
            };

            res.status(200).json(tempObj);
        } catch (err) {
            console.log(err, "error");
            sendErrorResponse(res, 500, err);
        }
    },
};
