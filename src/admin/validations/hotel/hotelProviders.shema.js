const Joi = require("joi");

const hoteProvidersSchema = Joi.object({
    name: Joi.string().required(),
    isActive: Joi.boolean().required(),
    configurations: {
        hasRoomTypeAvailable: Joi.boolean().required(),
        genderRequired: Joi.boolean().required(),
        ageRequired: Joi.boolean().required(),
        allGuestDetailsRequired: Joi.boolean().required(),
    },
});

module.exports = { hoteProvidersSchema };
