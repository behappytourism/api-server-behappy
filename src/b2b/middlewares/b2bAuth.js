const jwt = require("jsonwebtoken");
const { sendErrorResponse } = require("../../helpers");

const { Reseller } = require("../models");

const b2bAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.split(" ")[1];
        if (!token) {
            return sendErrorResponse(res, 401, "token not found");
        }

        const decode = jwt.verify(token, process.env.JWT_SECRET);

        const reseller = await Reseller.findOne({
            _id: decode._id,
            jwtToken: token,
        })
            .populate("marketStrategy")
            .populate("configuration")
            .populate("country")
            .lean();
        // .cache();

        if (!reseller) {
            return sendErrorResponse(res, 401, "invalid token");
        }

        req.reseller = reseller;
        next();
    } catch (err) {
        console.log(err);
        sendErrorResponse(res, 401, err);
    }
};

module.exports = b2bAuth;
