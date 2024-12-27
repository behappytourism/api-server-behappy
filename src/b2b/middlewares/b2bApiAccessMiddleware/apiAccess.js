const jwt = require("jsonwebtoken");

const { sendErrorResponse } = require("../../../helpers");
const { Reseller } = require("../../models");

const apiAccess = (apiName) => {
    return async (req, res, next) => {
        try {
            const token = req.headers.authorization?.split(" ")[1];
            if (!token) {
                return sendErrorResponse(res, 401, "Token not found");
            }

            const decode = jwt.verify(token, process.env.JWT_SECRET);
            const reseller = await Reseller.findOne({
                _id: decode._id,
            })
                .populate("configuration")
                .populate("country")
                .lean();
            if (!reseller) {
                return sendErrorResponse(res, 401, "invalid token");
            }

            if (!reseller.configuration[`show${apiName}Api`]) {
                return sendErrorResponse(res, 401, `Access denied for ${apiName} API`);
            }

            req.reseller = reseller;
            next();
        } catch (err) {
            return sendErrorResponse(res, 403, err);
        }
    };
};

module.exports = apiAccess;
