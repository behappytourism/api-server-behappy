const { sendErrorResponse } = require("../../../helpers");
const { B2cBanner, EmailTemplate } = require("../../../models");
const { isValidObjectId } = require("mongoose");
const { EmailTemplateingSchema } = require("../../validations/email/emailTemplate.schema");
const fs = require("fs");
const path = require("path");
const ejs = require("ejs");
const {
    readFileAsync,
    replacePlaceholders,
} = require("../../helpers/email/emailCampaignSenderHelper");

module.exports = {
    addNewEmailTemplate: async (req, res) => {
        try {
            const { name, type, html, tags } = req.body;

            const { _, error } = EmailTemplateingSchema.validate({
                ...req.body,
                tags: tags ? JSON.parse(tags) : [],
            });

            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            let filePath;
            if (type === "manual") {
                if (!req.file?.path) {
                    return sendErrorResponse(res, 400, "file is required");
                } else {
                    filePath = "/" + req.file.path.replace(/\\/g, "/");
                }
            }

            let parsedTags;
            if (tags) {
                parsedTags = JSON.parse(tags);
            }

            const emailTemplate = new EmailTemplate({
                name,
                type,
                filePath,
                html,
                tags: parsedTags,
            });

            await emailTemplate.save();
            res.status(200).json(emailTemplate);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateEmailTemplate: async (req, res) => {
        try {
            const { id } = req.params;
            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid airline id");
            }

            const { name, type, html, tags } = req.body;

            const { _, error } = EmailTemplateingSchema.validate({
                name,
                type,
                html,
                tags: tags ? JSON.parse(tags) : [],
            });

            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            let filePath;
            if (req.file?.path) {
                image = "/" + req.file.path.replace(/\\/g, "/");
            }

            let parsedTags;
            if (tags) {
                parsedTags = JSON.parse(tags);
            }

            const emailTemplate = await EmailTemplate.findOneAndUpdate(
                { _id: id, isDeleted: false },
                {
                    name,
                    type,
                    html,
                    tags: parsedTags,
                    filePath,
                },
                { new: true, runValidators: true }
            );
            if (!emailTemplate) {
                return sendErrorResponse(res, 404, "email template not found");
            }

            res.status(200).json(emailTemplate);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteEmailTemplate: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid email id");
            }

            const emailTemplate = await EmailTemplate.findOneAndDelete({
                _id: id,
                isDeleted: false,
            });
            if (!emailTemplate) {
                return sendErrorResponse(res, 404, "email list not found");
            }

            res.status(200).json({
                message: "email template successfully deleted",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllEmailTemplate: async (req, res) => {
        try {
            const { skip = 0, limit = 10, searchQuery } = req.query;

            const filters = { isDeleted: false };

            if (searchQuery && searchQuery !== "") {
                filters.name = { $regex: searchQuery, $options: "i" };
            }

            const emailTemplates = await EmailTemplate.find(filters)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalEmailTemplates = await EmailTemplate.findOne(filters).count();

            res.status(200).json({
                emailTemplates,
                totalEmailTemplates,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleEmailTemplate: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid template id");
            }

            const emailTemplate = await EmailTemplate.findOne({
                _id: id,
                isDeleted: false,
            });
            if (!emailTemplate) {
                return sendErrorResponse(res, 404, "email template not found");
            }

            if (emailTemplate?.type === "manual") {
                const filePath = emailTemplate.filePath;
                const currentDir = __dirname;
                const targetFilePath = path.resolve(currentDir, `../../../../${filePath}`);

                fs.readFile(targetFilePath, "utf8", (err, data) => {
                    if (err) {
                        return res
                            .status(500)
                            .json({ error: "Failed to read email template file" });
                    }

                    emailTemplate.html = data;

                    res.status(200).json(emailTemplate);
                });
            } else {
                res.status(200).json(emailTemplate);
            }
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    getEmailTemplateLists: async (req, res) => {
        try {
            const filters = { isDeleted: false };

            const emailLists = await EmailTemplate.find(filters).sort({ createdAt: -1 }).lean();

            let emailTemplateList = [];
            for (let i = 0; i < emailLists.length; i++) {
                let emailTemplate = emailLists[i];
                if (emailTemplate?.type === "manual") {
                    const filePath = emailTemplate.filePath;
                    const currentDir = __dirname;
                    const targetFilePath = path.resolve(currentDir, `../../../../${filePath}`);

                    try {
                        const data = await readFileAsync(targetFilePath, "utf8");
                        emailLists[i].html = data;
                    } catch (err) {
                        console.error("Error reading file:", err);
                    }
                }
            }

            res.status(200).json(emailLists || []);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
