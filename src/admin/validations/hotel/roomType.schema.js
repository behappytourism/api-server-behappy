const Joi = require("joi");

const roomTypeSchema = Joi.object({
    hotel: Joi.string().required(),
    roomName: Joi.string().required(),
    viewType: Joi.string().allow("", null),
    serviceBy: Joi.string().valid("DAY", "NIGHT"),
    adultAgeFrom: Joi.number().required().min(0),
    adultAgeTo: Joi.number().required().min(0),
    childAgeFrom: Joi.number().required().min(0),
    childAgeTo: Joi.number().required().min(0),
    infantAgeFrom: Joi.number().required().min(0),
    infantAgeTo: Joi.number().required().min(0),
    amenities: Joi.array().items(Joi.string()),
    areaInM2: Joi.number().allow("", null),
    description: Joi.string().allow("", null),
    roomOccupancies: Joi.array().items({
        occupancyName: Joi.string().required(),
        shortName: Joi.string().required(),
        combinations: Joi.array()
            .items({
                adultCount: Joi.number().required().min(0).precision(0),
                childCount: Joi.number().required().min(0).precision(0),
                infantCount: Joi.number().required().min(0).precision(0),
                _id: Joi.string().allow("", null),
            })
            .required(),
        maxCount: Joi.number().required().min(0).precision(0),
        extraBed: Joi.number().required().min(0).precision(0),
        displayName: Joi.string().allow("", null),
        rollBed: Joi.number().required().min(0).precision(0),
        isActive: Joi.boolean().required(),
        _id: Joi.string().allow("", null),
    }),
    hotelBedRooms: Joi.array().items(Joi.string()),
    oldImages: Joi.array(),
    isActive: Joi.boolean().required(),
});

const hotelBedRoomTypeToMainSchema = Joi.object({
    hotelId: Joi.string().required(),
    hbRoomTypeId: Joi.string().required(),
});

module.exports = { roomTypeSchema, hotelBedRoomTypeToMainSchema };
