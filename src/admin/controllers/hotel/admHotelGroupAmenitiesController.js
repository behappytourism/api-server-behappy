const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { HotelAmenity, HotelAmenityGroup } = require("../../../models/hotel");
const { hotelAmenityGroupSchema } = require("../../validations/hotel/admHotelAmenity.schema");

module.exports = {
    addNewHotelAmenityGroup: async (req, res) => {
        try {
            const { name } = req.body;

            const { _, error } = hotelAmenityGroupSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            let iconImgPath;
            if (req.file?.path) {
                iconImgPath = "/" + req.file.path.replace(/\\/g, "/");
            }

            const newHotelGroupAmenity = new HotelAmenityGroup({
                name,
                icon: iconImgPath,
            });
            await newHotelGroupAmenity.save();

            res.status(200).json(newHotelGroupAmenity);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateHotelAmenityGroup: async (req, res) => {
        try {
            const { name, iconUrl } = req.body;
            const { id } = req.params;

            const { _, error } = hotelAmenityGroupSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }

            let iconImgPath = iconUrl;
            if (req.file?.path) {
                iconImgPath = "/" + req.file.path.replace(/\\/g, "/");
            }

            const hotelAmenityGroup = await HotelAmenityGroup.findByIdAndUpdate(
                id,
                {
                    name,
                    icon: iconImgPath ? iconImgPath : null,
                },
                { runValidators: true, new: true }
            );
            if (!hotelAmenityGroup) {
                return sendErrorResponse(res, 404, "hotel amenity not found");
            }

            res.status(200).json(hotelAmenityGroup);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteHotelAmenityGroup: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid hotel amenity id");
            }
            const hotelAmenityGroup = await HotelAmenityGroup.findByIdAndDelete(id);
            if (!hotelAmenityGroup) {
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

    getAllHotelGroupAmenities: async (req, res) => {
        try {
            const hotelGroupAmenities = await HotelAmenityGroup.find({}).sort({
                createdAt: -1,
            });
            res.status(200).json(hotelGroupAmenities);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllSubAmenities: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid amenity id");
            }

            const parentAmenity = await HotelAmenityGroup.findOne({
                _id: id,
            });
            if (!parentAmenity) {
                return sendErrorResponse(res, 404, "hotel amenity not found");
            }

            const hotelAmenities = await HotelAmenity.find({
                parentAmenity: id,
            }).sort({
                createdAt: -1,
            });

            res.status(200).json({ parentAmenity, amenities: hotelAmenities });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
