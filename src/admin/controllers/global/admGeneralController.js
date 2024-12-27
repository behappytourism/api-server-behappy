const { sendErrorResponse } = require("../../../helpers");
const { Country, Destination, Driver, Currency } = require("../../../models");
const { State, City, Area } = require("../../../models/global");

module.exports = {
    getGeneralData1: async (req, res) => {
        try {
            const countries = Country.find({ isDeleted: false }).sort({ countryName: 1 }).lean();
            const destinations = Destination.find({ isDeleted: false })
                .populate("country")
                .sort({ createdAt: -1 })
                .lean();
            const drivers = Driver.find({ isDeleted: false }).sort({ createdAt: -1 }).lean();
            const currencies = Currency.find({})
                .populate("country", "countryName flag")
                .sort({ createdAt: -1 })
                .lean();

            const response = await Promise.all([countries, destinations, drivers, currencies]);

            res.status(200).json({
                countries: response[0],
                destinations: response[1],
                drivers: response[2],
                currencies: response[3],
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getGeneralData2: async (req, res) => {
        try {
            const states = State.find({ isDeleted: false }).sort({ stateName: 1 }).lean();
            const cities = City.find({ isDeleted: false }).sort({ cityName: 1 }).lean();
            const areas = Area.find({ isDeleted: false }).sort({ areaName: 1 }).lean();

            const response = await Promise.all([states, cities, areas]);

            res.status(200).json({
                states: response[0],
                cities: response[1],
                areas: response[2],
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
