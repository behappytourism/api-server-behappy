const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { Airport, Country } = require("../../../models");
const { airportSchema } = require("../../validations/admAirport.schema");

module.exports = {
    addNewAirport: async (req, res) => {
        try {
            const { iataCode, country } = req.body;

            const { _, error } = airportSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const airport = await Airport.findOne({
                iataCode: iataCode?.toUpperCase(),
            });
            if (airport) {
                return sendErrorResponse(res, 400, "an airport with this iata code already exists");
            }

            if (!isValidObjectId(country)) {
                return sendErrorResponse(res, 400, "invalid country id");
            }
            const countryDetail = await Country.findOne({
                _id: country,
                isDeleted: false,
            });
            if (!countryDetail) {
                return sendErrorResponse(res, 404, "country not found");
            }

            const newAirport = new Airport({
                ...req.body,
                isDeleted: false,
                isActive: true,
                country: countryDetail?._id,
            });
            await newAirport.save();

            res.status(200).json({
                message: "new aiport successfully added",
                _id: newAirport?._id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateAirport: async (req, res) => {
        try {
            const { id } = req.params;
            const { iataCode, country } = req.body;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid airport id");
            }

            const { _, error } = airportSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const airportExist = await Airport.findOne({
                iataCode: iataCode?.toUpperCase(),
                _id: { $ne: id },
            });
            if (airportExist) {
                return sendErrorResponse(res, 400, "an airport with this iata code already exists");
            }

            if (!isValidObjectId(country)) {
                return sendErrorResponse(res, 400, "invalid country id");
            }
            const countryDetail = await Country.findOne({
                _id: country,
                isDeleted: false,
            });
            if (!countryDetail) {
                return sendErrorResponse(res, 404, "country not found");
            }

            const airport = await Airport.findOneAndUpdate(
                {
                    _id: id,
                    isDeleted: false,
                },
                { ...req.body },
                { runValidators: true, new: true }
            );
            if (!airport) {
                return sendErrorResponse(res, 404, "airport not found");
            }

            res.status(200).json({
                message: "aiport successfully updated",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteAirport: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid airport id");
            }

            const airport = await Airport.findOneAndDelete({
                _id: id,
                isDeleted: false,
            });
            if (!airport) {
                return sendErrorResponse(res, 404, "airport not found");
            }

            res.status(200).json({
                message: "airport successfully deleted",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllAirports: async (req, res) => {
        try {
            const { skip = 0, limit = 10, searchQuery } = req.query;

            const filters = { isDeleted: false };

            if (searchQuery && searchQuery !== "") {
                filters.$or = [
                    { airportName: { $regex: searchQuery, $options: "i" } },
                    { iataCode: { $regex: searchQuery, $options: "i" } },
                ];
            }

            const airports = await Airport.find(filters)
                .populate("country")
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalAirports = await Airport.find(filters).count();

            res.status(200).json({
                airports,
                totalAirports,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleAirport: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid airport id");
            }

            const airport = await Airport.findOne({
                isDeleted: false,
                _id: id,
            });
            if (!airport) {
                return sendErrorResponse(res, 404, "airport not found");
            }

            res.status(200).json(airport);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleAirportTerminals: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid airport id");
            }

            const airport = await Airport.findOne({
                isDeleted: false,
                _id: id,
            });
            if (!airport) {
                return sendErrorResponse(res, 404, "airport not found");
            }

            res.status(200).json({ airport });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateAirportTerminals: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid airport id");
            }

            const { data, terminalId, isEdit } = req.body;
            let airport;
            if (isEdit === true) {
                airport = await Airport.findOne({
                    _id: id,
                    isDeleted: false,
                });

                if (airport) {
                    airport.terminals.forEach((terminal) => {
                        if (terminal._id.toString() === terminalId) {
                            // Replace the object with the updated data
                            terminal.terminalName = data.terminalName;
                            terminal.terminalCode = data.terminalCode;
                            terminal.access = data.access;
                        }
                    });

                    await airport.save();
                }
            } else {
                airport = await Airport.findOneAndUpdate(
                    {
                        _id: id,
                        isDeleted: false,
                    },
                    {
                        $push: {
                            terminals: data,
                        },
                    },
                    { runValidators: true, new: true }
                );
            }

            if (!airport) {
                return sendErrorResponse(res, 404, "airport not found");
            }

            res.status(200).json({ message: "Successfuly updated", terminals: airport.terminals });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteAirportTerminal: async (req, res) => {
        try {
            const { id, terminalId } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid airport id");
            }

            console.log(id, terminalId, "body");

            let airport = await Airport.findOne({
                _id: id,
                isDeleted: false,
            });

            if (airport) {
                const filteredTerminals = airport.terminals.filter(
                    (terminal) => terminal._id != terminalId
                );

                console.log(filteredTerminals, "filteredTerminals");

                airport.terminals = filteredTerminals;
                await airport.save();
            }

            res.status(200).json("terminal deleted successfully");
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },
};
