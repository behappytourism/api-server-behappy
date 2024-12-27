const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { Country } = require("../../../models");
const { State, City } = require("../../../models/global");
const { citySchema } = require("../../validations/global/city.schema");

module.exports = {
    addNewCity: async (req, res) => {
        try {
            const { cityCode, cityName, country, state } = req.body;

            const { _, error } = citySchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(country)) {
                return sendErrorResponse(res, 400, "invalid country id");
            }

            const countryDetail = await Country.findOne({
                isDeleted: false,
                _id: country,
            });
            if (!countryDetail) {
                return sendErrorResponse(res, 404, "county not found");
            }

            if (!isValidObjectId(state)) {
                return sendErrorResponse(res, 400, "invalid state id");
            }

            const stateDetail = await State.findOne({
                _id: state,
                country,
                isDeleted: false,
            });
            if (!stateDetail) {
                return sendErrorResponse(res, 404, "state not found");
            }

            const exCity = await City.findOne({
                cityCode: cityCode?.toUpperCase(),
                country: country,
                state: state,
                isDeleted: false,
            });
            if (exCity) {
                return sendErrorResponse(res, 400, "cityCode already exists");
            }

            const newCity = await City({
                cityCode,
                cityName,
                state,
                country,
            });
            await newCity.save();

            res.status(200).json(newCity);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateCity: async (req, res) => {
        try {
            const { id } = req.params;
            const { cityCode, cityName, country, state } = req.body;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid city id");
            }

            const { _, error } = citySchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(country)) {
                return sendErrorResponse(res, 400, "invalid country id");
            }
            const countryDetail = await Country.findOne({
                isDeleted: false,
                _id: country,
            });
            if (!countryDetail) {
                return sendErrorResponse(res, 404, "county not found");
            }

            if (!isValidObjectId(state)) {
                return sendErrorResponse(res, 400, "invalid state id");
            }
            const stateDetail = await State.findOne({
                isDeleted: false,
                _id: state,
                country,
            });
            if (!stateDetail) {
                return sendErrorResponse(res, 404, "state not found");
            }

            const exCity = await City.findOne({
                cityCode: cityCode?.toUpperCase(),
                country: country,
                state: state,
                isDeleted: false,
                _id: { $ne: id },
            });
            if (exCity) {
                return sendErrorResponse(res, 400, "cityCode already exists");
            }

            const city = await City.findOneAndUpdate(
                { _id: id, isDeleted: false },
                {
                    cityCode,
                    cityName,
                    state,
                    country,
                },
                {
                    new: true,
                    runValidators: true,
                }
            );
            if (!city) {
                return sendErrorResponse(res, 404, "city not found");
            }

            res.status(200).json(city);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteCity: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid city id");
            }

            const city = await City.findOneAndUpdate(
                {
                    _id: id,
                    isDeleted: false,
                },
                { isDeleted: true }
            );
            if (!city) {
                return sendErrorResponse(res, 404, "city not found");
            }

            res.status(200).json({
                message: "city successfully deleted",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllCities: async (req, res) => {
        try {
            const cities = await City.find({ isDeleted: false });
            res.status(200).json(cities);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllCitiesByState: async (req, res) => {
        try {
            const { stateId } = req.params;

            if (!isValidObjectId(stateId)) {
                return sendErrorResponse(res, 400, "invalid state id");
            }
            const stateDetail = await State.findOne({ _id: stateId, isDeleted: false })
                .populate("country")
                .lean();
            if (!stateDetail) {
                return sendErrorResponse(res, 404, "state not found");
            }

            const cities = await City.find({ state: stateId, isDeleted: false })
                .sort({ createdAt: -1 })
                .lean();

            res.status(200).json({ state: stateDetail, cities });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllCitiesByCountry: async (req, res) => {
        try {
            const { countryId } = req.params;

            if (!isValidObjectId(countryId)) {
                return sendErrorResponse(res, 400, "invalid country id");
            }
            const countryDetail = await Country.findOne({
                _id: countryId,
                isDeleted: false,
            }).lean();
            if (!countryDetail) {
                return sendErrorResponse(res, 404, "country not found");
            }

            const cities = await City.find({ country: countryId, isDeleted: false })
                .select("cityName")
                .sort({ createdAt: -1 })
                .lean();

            res.status(200).json({ country: countryDetail, cities });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
