const { sendErrorResponse } = require("../../../helpers");
const { AdminB2bAccess } = require("../../../models");
const { Admin } = require("../../models");

module.exports = {
    addAdminB2bAccess: async (req, res) => {
        try {
            const { reseller } = req.params;
            const { a2as, fligths, attractions, hotels, quotations, visas } = req.body;

            const updatedAdminAccess = await AdminB2bAccess.findOneAndUpdate(
                { reseller, isDeleted: false },
                { reseller, a2as, fligths, attractions, hotels, quotations, visas },
                {
                    new: true,
                    upsert: true,
                    setDefaultsOnInsert: true,
                }
            );

            console.log(updatedAdminAccess, "updated");

            if (!updatedAdminAccess) {
                return sendErrorResponse(res, 400, "something went wrong");
            }

            res.status(200).json({ message: "updated successfully" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAdmins: async (req, res) => {
        try {
            const admins = await Admin.find({ isDeleted: false });

            if (!admins) {
                return sendErrorResponse(res, 400, "Admins Not Found");
            }

            res.status(200).json({ admins: admins });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAdminB2bAccess: async (req, res) => {
        try {
            const { reseller } = req.params;

            const adminAccess = await AdminB2bAccess.findOne({ reseller });

            if (!adminAccess) {
                return sendErrorResponse(res, 400, "not added ");
            }

            res.status(200).json({ adminAccess: adminAccess });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
