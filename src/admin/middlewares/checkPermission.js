const jwt = require("jsonwebtoken");

const { Admin } = require("../models");
const { sendErrorResponse } = require("../../helpers");

function checkPermission(name, permission) {
    return async function (req, res, next) {
        try {
            const token = req.headers.authorization?.split(" ")[1];
            const decode = jwt.verify(token, process.env.JWT_SECRET);
            const admin = await Admin.findOne({
                _id: decode._id,
                jwtToken: token,
            })
                .populate("roles")
                .lean();

            if (!admin) {
                return sendErrorResponse(res, 401, "invalid token");
            }

            const adminRoles = admin.roles;
            let hasPermission = false;

            for (let i = 0; i < adminRoles?.length; i++) {
                let role = adminRoles[i];
                for (let j = 0; j < role?.roles?.length; j++) {
                    if (
                        role?.roles[j]?.name === name &&
                        role?.roles[j]?.permissions?.includes(permission)
                    ) {
                        hasPermission = true;
                        break;
                    }
                }
            }

            if (hasPermission) {
                req.admin = admin;
                next();
            } else {
                res.status(401).json({ error: "permission denied" });
            }
        } catch (err) {
            sendErrorResponse(res, 401, err);
        }
    };
}

module.exports = checkPermission;
