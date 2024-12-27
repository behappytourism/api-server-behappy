const { isValidObjectId, Types } = require("mongoose");
const { sendErrorResponse } = require("../../../helpers");
const { Attraction, AttractionActivity } = require("../../../models");
const {
    B2BClientAttractionMarkup,
    B2BSubAgentAttractionMarkup,
    B2BSubAgentQuotationMarkup,
} = require("../../models");
const B2BClientQuotationMarkup = require("../../models/quotation/b2bClientQuotationMarkup.model");
const {
    b2bClientAttractionMarkupSchema,
} = require("../../validations/b2bClientAttractionMarkupSchema");
const {
    b2bClientQuotationMarkupSchema,
    b2bSubAgentQuotationMarkupSchema,
} = require("../../validations/quoatation/b2bQuotationMarkup.schema");

module.exports = {
    upsertB2bClientQuotationMarkup: async (req, res) => {
        try {
            const {
                hotelMarkup,
                hotelMarkupType,
                landmarkMarkup,
                landmarkMarkupType,
                visaMarkup,
                visaMarkupType,
            } = req.body;

            const { _, error } = b2bClientQuotationMarkupSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            const b2bClientAttractionMarkup = await B2BClientQuotationMarkup.findOneAndUpdate(
                {
                    resellerId: req.reseller._id,
                },
                {
                    hotelMarkup,
                    hotelMarkupType,
                    landmarkMarkup,
                    landmarkMarkupType,
                    visaMarkup,
                    visaMarkupType,
                    resellerId: req.reseller._id,
                },
                { upsert: true, new: true, runValidators: true }
            );

            res.status(200).json({
                _id: b2bClientAttractionMarkup._id,
                message: "updated successfully",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    upsertB2bSubAgentQuotationMarkup: async (req, res) => {
        try {
            const {
                hotelMarkup,
                hotelMarkupType,
                landmarkMarkup,
                landmarkMarkupType,
                visaMarkup,
                visaMarkupType,
            } = req.body;

            const { _, error } = b2bSubAgentQuotationMarkupSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            const b2bSubAgentAttractionMarkup = await B2BSubAgentQuotationMarkup.findOneAndUpdate(
                {
                    resellerId: req.reseller._id,
                },
                {
                    hotelMarkup,
                    hotelMarkupType,
                    landmarkMarkup,
                    landmarkMarkupType,
                    visaMarkup,
                    visaMarkupType,
                    resellerId: req.reseller._id,
                },
                { upsert: true, new: true, runValidators: true }
            );

            res.status(200).json({
                _id: b2bSubAgentAttractionMarkup._id,
                message: "updated successfully",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    listQuotationMarkup: async (req, res) => {
        try {
            let selectedSubAgentMarkup = await B2BSubAgentQuotationMarkup.findOne({
                resellerId: req.reseller._id,
            });

            let selectedClientMarkup = await B2BSubAgentQuotationMarkup.findOne({
                resellerId: req.reseller._id,
            });

            const subAgentMarkup = {
                hotelMarkupType: selectedSubAgentMarkup?.hotelMarkupType || "flat",
                hotelMarkup: selectedSubAgentMarkup?.hotelMarkup || 0,
                landmarkMarkupType: selectedSubAgentMarkup?.landmarkMarkupType || "flat",
                landmarkMarkup: selectedSubAgentMarkup?.landmarkMarkup || 0,
                visaMarkupType: selectedSubAgentMarkup?.visaMarkupType || "flat",
                visaMarkup: selectedSubAgentMarkup?.visaMarkup || 0,
            };

            const clientMarkup = {
                hotelMarkupType: selectedClientMarkup?.hotelMarkupType || "flat",
                hotelMarkup: selectedClientMarkup?.hotelMarkup || 0,
                landmarkMarkupType: selectedClientMarkup?.landmarkMarkupType || "flat",
                landmarkMarkup: selectedClientMarkup?.landmarkMarkup || 0,
                visaMarkupType: selectedClientMarkup?.visaMarkupType || "flat",
                visaMarkup: selectedClientMarkup?.visaMarkup || 0,
            };

            res.status(200).json({ subAgentMarkup, clientMarkup });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
