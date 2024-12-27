const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { AttractionTicketLog, Attraction, AttractionActivity } = require("../../../models");
const {
    attractionTicketLogSchema,
} = require("../../helpers/attraction/attractionTicketLogsController");

module.exports = {
    addNewAttractionTicketLog: async (req, res) => {
        try {
            const { attraction, activity } = req.body;

            const { error } = attractionTicketLogSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(attraction)) {
                return sendErrorResponse(res, 400, "invalid attraction id");
            }
            const attractionDetails = await Attraction.findById(attraction).lean();
            if (!attractionDetails) {
                return sendErrorResponse(res, 400, "attraction not found");
            }

            if (!isValidObjectId(activity)) {
                return sendErrorResponse(res, 400, "invalid activity id");
            }
            const activityDetails = await AttractionActivity.findById(activity).lean();
            if (!activityDetails) {
                return sendErrorResponse(res, 400, "activity not found");
            }

            const newAttractionTicketLog = new AttractionTicketLog({
                ...req.body,
                attractionName: attractionDetails?.title,
                activityName: activityDetails?.name,
                admin: req.admin._id,
                adminName: req.admin?.name,
                ipaddress: req.headers["x-forwarded-for"] || req.ip,
            });
            await newAttractionTicketLog.save();

            res.status(200).json({ message: "success" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
