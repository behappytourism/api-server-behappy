const Joi = require("joi");

const validOptions = ["view", "create", "update", "delete", "approve", "cancel"];

const adminRoleSchema = Joi.object({
    roleName: Joi.string().required(),
    roles: Joi.array().items({
        _id: Joi.allow("", null),
        name: Joi.string().required(),
        displayName: Joi.string().required(),
        category: Joi.string().required(),
        permissions: Joi.array().items(Joi.string().valid(...validOptions)),
    }),
});

module.exports = { adminRoleSchema };
