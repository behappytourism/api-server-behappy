const { isValidObjectId, Types } = require("mongoose");
const { sendErrorResponse } = require("../../../helpers");
const { VisaType } = require("../../../models");
const { B2BSubAgentVisaMarkup } = require("../../models");
const { b2bSubAgentVisaMarkupSchema } = require("../../validations/b2bVisaMarkup.schema");

module.exports = {
    upsertB2bSubAgentVisaMarkup: async (req, res) => {
        try {
            const { markupType, markup, visaType, subAgentId } = req.body;

            const { _, error } = b2bSubAgentVisaMarkupSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            if (!isValidObjectId(visaType)) {
                return sendErrorResponse(res, 400, "Invalid visaType id");
            }

            const visaDetail = await VisaType.findOne({
                _id: visaType,
                isDeleted: false,
            });
            if (!visaDetail) {
                return sendErrorResponse(res, 400, "VisaType Not Found");
            }

            const b2bSubAgentVisaMarkups = await B2BSubAgentVisaMarkup.findOneAndUpdate(
                {
                    visaType,
                    resellerId: subAgentId,
                },
                {
                    visaType,
                    markupType,
                    markup,
                    resellerId: subAgentId,
                },
                { upsert: true, new: true, runValidators: true }
            );

            // let tempObj = Object(b2bClientVisaMarkups);
            // tempObj.attraction = {
            //     _id: attractionDetail?._id,
            //     title: attractionDetail?.title,
            // };

            res.status(200).json(b2bSubAgentVisaMarkups);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    listB2bSubAgentVisaMarkup: async (req, res) => {
        try {
            const { subAgentId } = req.params;
            const visas = await VisaType.find({ isDeleted: false });

            const subAgentMarkup = await B2BSubAgentVisaMarkup.find({
                resellerId: subAgentId,
                isDeleted: false,
            });

            const visaList = [];

            for (const visa of visas) {
                const selectedSubAgentMarkup = subAgentMarkup?.find((vs) => {
                    return vs?.visaType?.toString() === visa?._id.toString();
                });

                visaList.push({
                    subAgentMarkup: {
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
