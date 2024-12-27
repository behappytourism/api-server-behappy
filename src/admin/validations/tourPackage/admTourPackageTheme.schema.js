const Joi = require("joi");

const admTourPackageThemeSchema = Joi.object({
    themeName: Joi.string().required(),
});

module.exports = { admTourPackageThemeSchema };
