const { sendErrorResponse } = require("../../../helpers");
const { isValidObjectId } = require("mongoose");
const { notificationSchema } = require("../../validations/notification/admNotification.schema");
const { Notification } = require("../../../models");
const {
    createAppNotififcation,
} = require("../../../helpers/notification/admAddNotiifcationHelper");

module.exports = {
    addNotification: async (req, res) => {
        try {
            const { _, error } = notificationSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            let image;
            if (!req.file?.path) {
                return sendErrorResponse(res, 400, "notification image is required");
            } else {
                image = "/" + req.file.path.replace(/\\/g, "/");
            }

            const newNotification = new Notification({
                ...req.body,
                image,
                isDeleted: false,
            });
            await newNotification.save();

            res.status(200).json({
                message: "new notification added successfully",
                _id: newNotification._id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
    listAllNotification: async (req, res) => {
        try {
            const { skip = 0, limit = 10, searchQuery } = req.query;

            const filters = { isDeleted: false };
            const notifications = await Notification.find(filters)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();
            const totalNotifications = await Notification.findOne(filters).count();

            res.status(200).json({
                notifications,
                totalNotifications,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
    getSingleNotification: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid airline id");
            }

            const notification = await Notification.findOne({
                _id: id,
                isDeleted: false,
            });
            if (!notification) {
                return sendErrorResponse(res, 404, "notiifcation not found");
            }

            res.status(200).json(notification);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
    updateNotification: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid notification id");
            }

            const { _, error } = notificationSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            let image;
            if (req.file?.path) {
                image = "/" + req.file.path.replace(/\\/g, "/");
            }

            const notification = await Notification.findOneAndUpdate(
                { _id: id, isDeleted: false },
                {
                    ...req.body,
                    image,
                },
                { new: true, runValidators: true }
            );
            if (!notification) {
                return sendErrorResponse(res, 404, "notification not found");
            }

            res.status(200).json({
                message: "notification successfully updated",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteNotification: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid notification id");
            }

            const notification = await Notification.findOneAndDelete({
                _id: id,
                isDeleted: false,
            });
            if (!notification) {
                return sendErrorResponse(res, 404, "notification not found");
            }

            res.status(200).json({
                message: "notification successfully deleted",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    pushNotification: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid notification id");
            }

            const notification = await Notification.findOne({
                _id: id,
                isDeleted: false,
            });

            if (!notification) {
                return sendErrorResponse(res, 404, "notification not found");
            }
            console.log(notification, "notification");
            const { title, page, body, image, slug } = notification;

            await createAppNotififcation({title, page, body, image, slug });

            res.status(200).json({
                message: " notification send successfully",
                _id: notification,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
