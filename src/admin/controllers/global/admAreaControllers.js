const { isValidObjectId } = require("mongoose");
const { sendErrorResponse } = require("../../../helpers");
const { Area, City, State } = require("../../../models/global");
const { admAreaSchema } = require("../../validations/hotel/admArea.schema");
const { Country } = require("../../../models");

module.exports = {
    addNewArea: async (req, res) => {
        try {
            const { city, state, country, areaCode } = req.body;

            const { _, error } = admAreaSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(city)) {
                return sendErrorResponse(res, 400, "invalid city id");
            }
            const cityDetail = await City.findOne({ _id: city, state, country });
            if (!cityDetail) {
                return sendErrorResponse(res, 404, "city not found");
            }

            if (!isValidObjectId(state)) {
                return sendErrorResponse(res, 400, "invalid state id");
            }
            const stateDetail = await State.findOne({ _id: state, country });
            if (!stateDetail) {
                return sendErrorResponse(res, 404, "state not found");
            }

            if (!isValidObjectId(country)) {
                return sendErrorResponse(res, 400, "invalid country id");
            }
            const countryDetail = await Country.findById(country);
            if (!countryDetail) {
                return sendErrorResponse(res, 404, "country not found");
            }

            const exArea = await Area.findOne({
                areaCode: areaCode?.toUpperCase(),
                city,
                isDeleted: false,
            });
            if (exArea) {
                return sendErrorResponse(res, 400, "areaCode already exists");
            }

            const newArea = new Area({ ...req.body });
            await newArea.save();

            res.status(200).json(newArea);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateArea: async (req, res) => {
        try {
            const { id } = req.params;
            const { city, state, country, areaCode } = req.body;

            const { _, error } = admAreaSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(city)) {
                return sendErrorResponse(res, 400, "invalid city id");
            }
            const cityDetail = await City.findOne({ _id: city, state, country });
            if (!cityDetail) {
                return sendErrorResponse(res, 404, "city not found");
            }

            if (!isValidObjectId(state)) {
                return sendErrorResponse(res, 400, "invalid state id");
            }
            const stateDetail = await State.findOne({ _id: state, country });
            if (!stateDetail) {
                return sendErrorResponse(res, 404, "state not found");
            }

            if (!isValidObjectId(country)) {
                return sendErrorResponse(res, 400, "invalid country id");
            }
            const countryDetail = await Country.findById(country);
            if (!countryDetail) {
                return sendErrorResponse(res, 404, "country not found");
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid area id");
            }

            const exArea = await Area.findOne({
                areaCode: areaCode?.toUpperCase(),
                city,
                _id: { $ne: id },
                isDeleted: false,
            });
            if (exArea) {
                return sendErrorResponse(res, 400, "areaCode already exists");
            }

            const area = await Area.findOneAndUpdate(
                { _id: id, isDeleted: false },
                { ...req.body },
                { runValidators: true, new: true }
            );
            if (!area) {
                return sendErrorResponse(res, 404, "area not found");
            }

            res.status(200).json(area);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteArea: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid area id");
            }

            const area = await Area.findOneAndUpdate(
                { _id: id, isDeleted: false },
                { isDeleted: true }
            );
            if (!area) {
                return sendErrorResponse(res, 400, "area not found");
            }

            res.status(200).json({ message: "area successfully deleted", _id: id });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllAreasByCities: async (req, res) => {
        try {
            const { cityId } = req.params;

            if (!isValidObjectId(cityId)) {
                return sendErrorResponse(res, 400, "invalid city id");
            }
            const city = await City.findOne({ _id: cityId, isDeleted: false }).populate(
                "state country"
            );
            if (!city) {
                return sendErrorResponse(res, 404, "city not found");
            }

            const areas = await Area.find({ city: cityId, isDeleted: false }).sort({
                createdAt: -1,
            });

            res.status(200).json({
                city,
                areas,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
