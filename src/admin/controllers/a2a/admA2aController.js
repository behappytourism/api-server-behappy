const { isValidObjectId } = require("mongoose");
const { B2BA2a, B2BMarkupProfile } = require("../../../b2b/models");
const { sendErrorResponse } = require("../../../helpers");
const { Airport } = require("../../../models");
const MarkupProfile = require("../../models/markupProfile.model");
const { addA2aSchema } = require("../../validations/admA2a.schema");

module.exports = {
    addNewA2a: async (req, res) => {
        try {
            const { airportFrom, airportTo, markupUpdate } = req.body;
            const { _, error } = addA2aSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }
            console.log("hiii");

            let b2bA2a = new B2BA2a({
                airportFrom: airportFrom,
                airportTo: airportTo,
            });

            await b2bA2a.save();

            const updatedProfiles = await Promise.all(
                markupUpdate.map(async (update) => {
                    const updateProfile = await MarkupProfile.findOneAndUpdate(
                        { _id: update.profileId },
                        {
                            $push: {
                                atoA: {
                                    atoa: b2bA2a._id,
                                    markup: update.markup,
                                    markupType: update.markupType,
                                },
                            },
                        }
                    );
                    return updateProfile;
                })
            );

            const updatedB2bProfiles = await Promise.all(
                markupUpdate.map(async (updateBb2) => {
                    const updateProfile = await B2BMarkupProfile.updateMany(
                        { selectedProfile: updateBb2.profileId },
                        {
                            $push: {
                                atoA: {
                                    atoa: b2bA2a._id,
                                    markup: updateBb2.markup,
                                    markupType: updateBb2.markupType,
                                },
                            },
                        }
                    );
                    return updateProfile;
                })
            );

            b2bA2a = await B2BA2a.findById(b2bA2a._id)
                .populate("airportFrom")
                .populate("airportTo");

            res.status(200).json({
                data: b2bA2a,
                message: "New A2a Created",
            });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    listAllA2a: async (req, res) => {
        try {
            const { skip = 0, limit = 10 } = req.query;

            const a2aList = await B2BA2a.find({ isDeleted: false })
                .populate({
                    path: "airportFrom",
                    select: "airportName iataCode",
                })
                .populate({
                    path: "airportTo",
                    select: "airportName iataCode",
                })
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalA2aList = await B2BA2a.find({
                isDeleted: false,
            }).count();

            res.status(200).json({
                a2aList,
                totalA2aList,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteA2a: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid airline id");
            }

            const airline = await B2BA2a.findOneAndDelete({
                _id: id,
                isDeleted: false,
            });

            if (!airline) {
                return sendErrorResponse(res, 404, "airline not found");
            }

            await MarkupProfile.updateMany(
                {
                    "atoA.atoa": id,
                },
                {
                    $pull: {
                        atoA: { atoa: id },
                    },
                }
            );

            await B2BMarkupProfile.updateMany(
                {
                    "atoA.atoa": id,
                },
                {
                    $pull: {
                        atoA: { atoa: id },
                    },
                }
            );

            res.status(200).json({
                message: "A2A successfully deleted",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleA2A: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid A2a id");
            }

            const b2bA2a = await B2BA2a.findOne({
                _id: id,
                isDeleted: false,
            });
            if (!b2bA2a) {
                return sendErrorResponse(res, 404, "A2a not found");
            }

            res.status(200).json(b2bA2a);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateA2a: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid api id");
            }

            const { _, error } = addA2aSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const a2a = await B2BA2a.findByIdAndUpdate(id, {
                ...req.body,
            });
            if (!a2a) {
                return sendErrorResponse(res, 500, "api not found");
            }

            res.status(200).json({
                message: "A2a successfully updated",
                _id: a2a._id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllAirports: async (req, res) => {
        try {
            const airports = await Airport.find({ isDeleted: false })
                .populate("country")
                .sort({ createdAt: -1 })
                .lean();

            res.status(200).json({
                airports,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
