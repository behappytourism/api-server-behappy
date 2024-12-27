const fs = require("fs");
const { parse } = require("csv-parse");
const { isValidObjectId } = require("mongoose");

const { sendErrorResponse, createQuotationPdf } = require("../../../helpers");
const { Guide } = require("../../../models");

module.exports = {
    addGuide: async (req, res) => {
        try {
            const { name, duration, pricing } = req.body;

            const newGuide = new Guide({
                name,
                duration,
                pricing,
            });

            await newGuide.save();

            res.status(200).json({ newGuide: newGuide, message: "added successfully" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    listGuide: async (req, res) => {
        try {
            const { skip = 0, limit = 10 } = req.query;

            const guides = await Guide.find({ isDeleted: false })
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            if (!guides) {
                return sendErrorResponse(res, 400, "guides not found ");
            }
            const totalGuides = await Guide.find({
                isDeleted: false,
            }).count();

            res.status(200).json({
                guides,
                totalGuides,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleGuide: async (req, res) => {
        try {
            const { id } = req.params;

            const guide = await Guide.findOne({ _id: id, isDeleted: false });

            if (!guide) {
                return sendErrorResponse(res, 400, "guides not found ");
            }

            res.status(200).json(guide);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    editGuide: async (req, res) => {
        try {
            const { id } = req.params;
            const { name, duration, pricing } = req.body;

            const guide = await Guide.findByIdAndUpdate(id, { name, duration, pricing });

            if (!guide) {
                return sendErrorResponse(res, 400, "guides not found ");
            }

            res.status(200).json({ newGuide: guide, message: "edited successfully" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteGuide: async (req, res) => {
        try {
            const { id } = req.params;
            const guide = await Guide.findByIdAndUpdate(id, { isDeleted: true });
            if (!guide) {
                return sendErrorResponse(res, 400, "guides not found ");
            }

            res.status(200).json({ guide: guide._id, message: "DELETED successfully" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
