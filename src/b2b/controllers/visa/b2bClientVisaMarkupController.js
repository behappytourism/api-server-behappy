const { isValidObjectId, Types } = require("mongoose");
const { sendErrorResponse } = require("../../../helpers");
const { VisaType } = require("../../../models");
const { B2BClientVisaMarkup } = require("../../models");
const { b2bClientVisaMarkupSchema } = require("../../validations/b2bVisaMarkup.schema");

module.exports = {
    upsertB2bClientVisaMarkup: async (req, res) => {
        try {
            const { markupType, markup, visaType } = req.body;

            const { _, error } = b2bClientVisaMarkupSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            if (!isValidObjectId(visaType)) {
                return sendErrorResponse(res, 400, "Invalid visaType id");
            }

            if (markup < 0) {
                return sendErrorResponse(res, 400, "Markup should be greater than zero");
            }

            const visaDetail = await VisaType.findOne({
                _id: visaType,
                isDeleted: false,
            });
            if (!visaDetail) {
                return sendErrorResponse(res, 400, "VisaType Not Found");
            }

            const b2bClientVisaMarkups = await B2BClientVisaMarkup.findOneAndUpdate(
                {
                    visaType,
                },
                {
                    visaType,
                    markupType,
                    markup,
                    resellerId: req.reseller._id,
                },
                { upsert: true, new: true, runValidators: true }
            );

            // let tempObj = Object(b2bClientVisaMarkups);
            // tempObj.attraction = {
            //     _id: attractionDetail?._id,
            //     title: attractionDetail?.title,
            // };

            res.status(200).json(b2bClientVisaMarkups);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteB2bClientVisaMarkup: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid markup id");
            }

            const b2bClientVisaMarkups = await B2BClientVisaMarkup.findByIdAndDelete(id);

            if (!b2bClientVisaMarkups) {
                return sendErrorResponse(res, 404, "B2B Visa markup not found");
            }

            res.status(200).json({
                message: "b2b visa markup deleted successfully",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    listB2bClientVisaMarkup: async (req, res) => {
        try {
            const visas = await VisaType.find({ isDeleted: false });

            const subAgentMarkup = await B2BClientVisaMarkup.find({
                resellerId: req.reseller._id,
                isDeleted: false,
            });

            const visaList = [];

            for (const visa of visas) {
                const selectedSubAgentMarkup = subAgentMarkup?.find((vs) => {
                    return vs?.visaType?.toString() === visa?._id.toString();
                });

                visaList.push({
                    clientMarkup: {
                        markup: selectedSubAgentMarkup?.markup || 0,
                        markupType: selectedSubAgentMarkup?.markupType || "flat",
                    },
                    visaName: visa.visaName,
                    _id: visa._id,
                });
            }
            res.status(200).json(visaList);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
