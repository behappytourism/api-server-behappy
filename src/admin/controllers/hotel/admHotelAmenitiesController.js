const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { HotelAmenity, HotelAmenityGroup } = require("../../../models/hotel");
const { hotelAmenitySchema } = require("../../validations/hotel/admHotelAmenity.schema");

module.exports = {
    addNewHotelAmenity: async (req, res) => {
        try {
            const { name, parent } = req.body;

            const { _, error } = hotelAmenitySchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            let iconImgPath;
            if (req.file?.path) {
                iconImgPath = "/" + req.file.path.replace(/\\/g, "/");
            }

            if (!isValidObjectId(parent)) {
                return sendErrorResponse(res, 400, "invalid parent amenity id");
            }
            const parentAmenity = await HotelAmenityGroup.findOne({
                _id: parent,
            });
            if (!parentAmenity) {
                return sendErrorResponse(res, 404, "parent amenity not found");
            }

            const newHotelAmenity = new HotelAmenity({
                name,
                parentAmenity: parent,
                icon: iconImgPath,
            });
            await newHotelAmenity.save();

            res.status(200).json(newHotelAmenity);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateHotelAmenity: async (req, res) => {
        try {
            const { name, parent, iconUrl } = req.body;
            const { id } = req.params;

            const { _, error } = hotelAmenitySchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }

            if (!isValidObjectId(parent)) {
                return sendErrorResponse(res, 400, "invalid parent amenity id");
            }
            const parentAmenity = await HotelAmenityGroup.findOne({
                _id: parent,
            });
            if (!parentAmenity) {
                return sendErrorResponse(res, 404, "parent amenity not found");
            }

            let iconImgPath = iconUrl;
            if (req.file?.path) {
                iconImgPath = "/" + req.file.path.replace(/\\/g, "/");
            }

            const hotelAmenity = await HotelAmenity.findByIdAndUpdate(
                id,
                {
                    name,
                    icon: iconImgPath ? iconImgPath : null,
                    parentAmenity: parent,
                },
                { runValidators: true, new: true }
            );
            if (!hotelAmenity) {
                return sendErrorResponse(res, 404, "hotel amenity not found");
            }

            res.status(200).json(hotelAmenity);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteHotelAmenity: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid hotel amenity id");
            }
            const hotelAmenity = await HotelAmenity.findByIdAndDelete(id);
            if (!hotelAmenity) {
                return sendErrorResponse(res, 404, "hotel amenity not found");
            }

            res.status(200).json({
                message: "hotel amenity successfully deleted",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllHotelAmenities: async (req, res) => {
        try {
            const hotelAmenities = await HotelAmenity.find({})
                .sort({
                    createdAt: -1,
                })
                .lean();
            res.status(200).json(hotelAmenities);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
