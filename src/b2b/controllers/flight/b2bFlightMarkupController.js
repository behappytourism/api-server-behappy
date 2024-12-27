const { isValidObjectId, Types } = require("mongoose");
const { sendErrorResponse } = require("../../../helpers");
const { VisaType, Airline } = require("../../../models");
const {
    B2BClientVisaMarkup,
    B2BSubAgentFlightMarkup,
    B2BClientFlightMarkup,
    Reseller,
} = require("../../models");
const { b2bFightMarkupSchema } = require("../../validations/b2bFlightMarkSchema");

module.exports = {
    upsertB2bClientFlightMarkup: async (req, res) => {
        try {
            const { markupType, markup, airline } = req.body;

            const { _, error } = b2bFightMarkupSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            if (!isValidObjectId(airline)) {
                return sendErrorResponse(res, 400, "Invalid Airline Id");
            }

            const airlineDetail = await Airline.findOne({
                _id: airline,
                isDeleted: false,
            });
            if (!airlineDetail) {
                return sendErrorResponse(res, 400, "Airline Not Found");
            }

            const b2bClientFlightMarkups = await B2BClientFlightMarkup.findOneAndUpdate(
                {
                    airline,
                },
                {
                    airline,
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

            res.status(200).json(b2bClientFlightMarkups);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    upsertB2bSubAgentFlightMarkup: async (req, res) => {
        try {
            const { markupType, markup, airline, subAgentId } = req.body;

            const { _, error } = b2bFightMarkupSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            if (!isValidObjectId(airline)) {
                return sendErrorResponse(res, 400, "Invalid airline id");
            }

            const subAgent = await Reseller.findOne({
                _id: subAgentId,
                referredBy: req?.reseller?._id,
            });

            if (!subAgent) {
                return sendErrorResponse(res, 400, "subagent not found");
            }

            const airlineDetail = await Airline.findOne({
                _id: airline,
                isDeleted: false,
            });
            if (!airlineDetail) {
                return sendErrorResponse(res, 400, "airline Not Found");
            }

            const b2bSubAgentFlightMarkups = await B2BSubAgentFlightMarkup.findOneAndUpdate(
                {
                    airline,
                },
                {
                    airline,
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

            res.status(200).json(b2bSubAgentFlightMarkups);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    listB2bSubAgentFlightMarkup: async (req, res) => {
        try {
            const { subAgentId } = req.params;

            const airlines = await Airline.find({ isDeleted: false });

            const subAgentMarkup = await B2BSubAgentFlightMarkup.find({
                resellerId: subAgentId,
                isDeleted: false,
            });

            const airlineList = [];

            for (const airline of airlines) {
                const selectedSubAgentMarkup = subAgentMarkup?.find((al) => {
                    return al?.airline?.toString() === airline?._id.toString();
                });

                airlineList.push({
                    subAgentMarkup: {
                        markup: selectedSubAgentMarkup?.markup || 0,
                        markupType: selectedSubAgentMarkup?.markupType || "flat",
                    },
                    name: airline.airlineName,
                    _id: airline._id,
                });
            }

            res.status(200).json(airlineList);
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    listB2bClientFlightMarkup: async (req, res) => {
        try {
            const airlines = await Airline.find({ isDeleted: false });

            const subAgentMarkup = await B2BClientFlightMarkup.find({
                resellerId: req.reseller._id,
                isDeleted: false,
            });

            const airlineList = [];

            for (const airline of airlines) {
                const selectedSubAgentMarkup = subAgentMarkup?.find((al) => {
                    return al?.airline?.toString() === airline?._id.toString();
                });

                airlineList.push({
                    subAgentMarkup: {
                        markup: selectedSubAgentMarkup?.markup || 0,
                        markupType: selectedSubAgentMarkup?.markupType || "flat",
                    },
                    airlineName: airline.airlineName,
                    _id: airline._id,
                });
            }
            res.status(200).json(airlineList);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
