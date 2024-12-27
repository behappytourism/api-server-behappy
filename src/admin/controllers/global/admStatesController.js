const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { Country } = require("../../../models");
const { State } = require("../../../models/global");
const { stateSchema } = require("../../validations/global/state.schema");

module.exports = {
    addState: async (req, res) => {
        try {
            const { stateName, country, stateCode } = req.body;

            const { _, error } = stateSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const countryDetail = await Country.findOne({
                _id: country,
                isDeleted: false,
            });
            if (!countryDetail) {
                return sendErrorResponse(res, 404, "country not found");
            }

            const exState = await State.findOne({
                stateCode: stateCode?.toUpperCase(),
                country: country,
                isDeleted: false,
            });
            if (exState) {
                return sendErrorResponse(res, 400, "state code already exists");
            }

            const newState = new State({
                stateName,
                country,
                stateCode,
            });
            await newState.save();

            res.status(200).json(newState);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateState: async (req, res) => {
        try {
            const { id } = req.params;
            const { stateName, country, stateCode } = req.body;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid state id");
            }

            const { _, error } = stateSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const countryDetail = await Country.findOne({
                _id: country,
                isDeleted: false,
            });
            if (!countryDetail) {
                return sendErrorResponse(res, 404, "country not found");
            }

            const exState = await State.findOne({
                stateCode: stateCode?.toUpperCase(),
                country: country,
                _id: { $ne: id },
                isDeleted: false,
            });
            if (exState) {
                return sendErrorResponse(res, 400, "state code already exists");
            }

            const state = await State.findOneAndUpdate(
                { _id: id, isDeleted: false },
                {
                    stateName,
                    country,
                    stateCode,
                },
                { new: true, runValidators: true }
            );
            if (!state) {
                return sendErrorResponse(res, 404, "state not found");
            }

            res.status(200).json(state);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteState: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid state id");
            }

            const state = await State.findOneAndUpdate(
                {
                    _id: id,
                    isDeleted: false,
                },
                {
                    isDeleted: true,
                }
            );
            if (!state) {
                return sendErrorResponse(res, 404, "state not found");
            }

            res.status(200).json({
                message: "country successfully deleted",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllStates: async (req, res) => {
        try {
            const states = await State.find({ isDeleted: false });

            res.status(200).json(states);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getStatesByCountry: async (req, res) => {
        try {
            const { countryId } = req.params;

            if (!isValidObjectId(countryId)) {
                return sendErrorResponse(res, 400, "invalid country id");
            }
            const countryDetail = await Country.findOne({ _id: countryId, isDeleted: false });
            if (!countryDetail) {
                return sendErrorResponse(res, 404, "country not found");
            }

            const states = await State.find({ country: countryId, isDeleted: false }).sort({
                createdAt: -1,
            });

            res.status(200).json({ country: countryDetail, states });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
