const Joi = require("joi");

const addRoomOccupancySchema = Joi.object({
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
    rollBed: Joi.number().required().min(0).precision(0),
    displayName: Joi.string().allow("", null),
});

module.exports = { addRoomOccupancySchema };
