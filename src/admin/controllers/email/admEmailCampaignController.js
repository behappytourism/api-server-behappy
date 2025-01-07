const { sendErrorResponse } = require("../../../helpers");
const {
    emailCampaign,
    EmailCampaign,
    EmailList,
    EmailTemplate,
    EmailImage,
    EmailFooter,
    EmailConfig,
} = require("../../../models");
const { isValidObjectId } = require("mongoose");
const {
    emailCampaignSchema,
    emailCampaginPreviewSchema,
    emailCampaginTestSchema,
} = require("../../validations/email/emailCampaign.schema");
const fs = require("fs");
const path = require("path");
const {
    replacePlaceholders,
    readFileAsync,
} = require("../../helpers/email/emailCampaignSenderHelper");
const sendCampaignEmail = require("../../helpers/email/sendCampaginEmail");
const md5 = require("md5");

module.exports = {
    addNewEmailCampaign: async (req, res) => {
        try {
            const {
                name,
                subject,
                hour,
                min,
                emailListId,
                emailTemplateId,
                campaignGroupId,
                tags,
                date,
                emailConfigId,
                emailFooterId,
            } = req.body;

            const { _, error } = emailCampaignSchema.validate({
                ...req.body,
            });

            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            let emailCampaign = new EmailCampaign({
                name,
                subject,
                date,
                hour,
                min,
                emailListId,
                emailTemplateId,
                campaignGroupId,
                tags,
                emailConfigId,
                emailFooterId,
            });

            await emailCampaign.save();

            let hashedCampaignId = md5(emailCampaign._id.toString());

            emailCampaign.hashedCampaignId = hashedCampaignId;

            await emailCampaign.save();

            res.status(200).json(emailCampaign);
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    updateEmailCampaign: async (req, res) => {
        try {
            const { id } = req.params;

            const {
                name,
                subject,
                hour,
                min,
                emailListId,
                emailTemplateId,
                campaignGroupId,
                tags,
                date,
                emailConfigId,
                emailFooterId,
            } = req.body;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid airline id");
            }

            const { _, error } = emailCampaignSchema.validate({
                ...req.body,
            });
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const emailCampaign = await EmailCampaign.findOneAndUpdate(
                { _id: id, isDeleted: false },
                {
                    name,
                    subject,
                    hour,
                    min,
                    emailListId,
                    emailTemplateId,
                    tags,
                    campaignGroupId,
                    date,
                    emailConfigId,
                    emailFooterId,
                },
                { new: true, runValidators: true }
            );
            if (!emailCampaign) {
                return sendErrorResponse(res, 404, "email list not found");
            }

            res.status(200).json(emailCampaign);
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    deleteEmailCampaign: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid email id");
            }

            const emailCampaign = await EmailCampaign.findOneAndDelete({
                _id: id,
                isDeleted: false,
            });
            if (!emailCampaign) {
                return sendErrorResponse(res, 404, "email list not found");
            }

            res.status(200).json({
                message: "email campaign successfully deleted",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    statusChangeEmailCampaign: async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;
            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid email id");
            }

            const emailCampaign = await EmailCampaign.findOneAndUpdate(
                {
                    _id: id,
                    isDeleted: false,
                },
                {
                    $set: {
                        status: status,
                    },
                },
                {
                    new: true,
                }
            );

            if (!emailCampaign) {
                return sendErrorResponse(res, 404, "email list not found");
            }

            res.status(200).json({
                message: `email campaign ${status} successfully `,
                _id: id,
                status: emailCampaign.status,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllEmailCampaign: async (req, res) => {
        try {
            const { id } = req.params;

            const { skip = 0, limit = 10, searchQuery } = req.query;

            const filters = { campaignGroupId: id, isDeleted: false };

            if (searchQuery && searchQuery !== "") {
                filters.name = { $regex: searchQuery, $options: "i" };
            }

            const emailCampaigns = await EmailCampaign.find(filters)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalemailCampaigns = await EmailCampaign.find(filters).count();

            res.status(200).json({
                emailCampaigns,
                totalemailCampaigns,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleEmailCampaign: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid airline id");
            }

            const emailCampaign = await EmailCampaign.findOne({
                _id: id,
                isDeleted: false,
            });

            if (!emailCampaign) {
                return sendErrorResponse(res, 404, "email list not found");
            }

            res.status(200).json(emailCampaign);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    emailCampaignPreviewData: async (req, res) => {
        try {
            const {
                name,
                date,
                subject,
                hour,
                min,
                emailListId,
                emailTemplateId,
                emailConfigId,
                emailFooterId,
            } = req.body;

            const { _, error } = emailCampaginPreviewSchema.validate({
                ...req.body,
            });

            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const emailLists = [];

            for (const email of emailListId) {
                const emailList = await EmailList.findOne({ _id: email, isDeleted: false });
                if (!emailList) {
                    return sendErrorResponse(res, 404, "email list not found");
                }
                emailLists.push(emailList);
            }

            const emailTemplate = await EmailTemplate.findOne({
                _id: emailTemplateId,
                isDeleted: false,
            });

            if (!emailTemplate) {
                return sendErrorResponse(res, 404, "email template not found");
            }

            const emailFooter = await EmailFooter.findOne({
                _id: emailFooterId,
                isDeleted: false,
            });

            if (!emailFooter) {
                return sendErrorResponse(res, 404, "email footer not found");
            }

            const emailConfig = await EmailConfig.findOne({
                _id: emailConfigId,
                isDeleted: false,
            });

            if (!emailConfig) {
                return sendErrorResponse(res, 404, "email config not found");
            }

            if (emailTemplate?.type === "manual") {
                const filePath = emailTemplate.filePath;
                const currentDir = __dirname;
                const targetFilePath = path.resolve(currentDir, `../../../../${filePath}`);

                // Read the file with UTF-8 encoding
                fs.readFile(targetFilePath, "utf8", (err, data) => {
                    if (err) {
                        return res
                            .status(500)
                            .json({ error: "Failed to read email template file" });
                    }

                    emailTemplate.html = data;

                    res.status(200).json({ emailTemplate, emailLists, emailFooter, emailConfig });
                });
            } else {
                res.status(200).json({ emailTemplate, emailLists, emailFooter, emailConfig });
            }
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    emailCampaginTest: async (req, res) => {
        try {
            const { emails, tags, emailTemplateId, subject, emailFooterId, emailConfigId } =
                req.body;

            const { _, error } = emailCampaginTestSchema.validate({
                ...req.body,
            });

            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            let users = [...emails];
            let template = "";

            const emailImages = await EmailImage.find({
                isDeleted: false,
            });

            const emailTemplate = await EmailTemplate.findOne({
                _id: emailTemplateId,
                isDeleted: false,
            });

            const emailFooter = await EmailFooter.findOne({ _id: emailFooterId, isDeleted: false });
            const emailConfig = await EmailConfig.findOne({ _id: emailConfigId, isDeleted: false });

            if (emailTemplate?.type === "manual") {
                const filePath = emailTemplate.filePath;
                const currentDir = __dirname;
                const targetFilePath = path.resolve(currentDir, `../../../../${filePath}`);

                try {
                    const data = await readFileAsync(targetFilePath, "utf8");
                    template = await replacePlaceholders(data || "", tags || [], emailImages);
                } catch (err) {
                    console.error("Error reading file:", err);
                }
            } else {
                template = emailTemplate?.html;
            }

            console.log(emailFooter, emailFooter);

            for (let j = 0; j < users.length; j++) {
                sendCampaignEmail({
                    email: users[j],
                    subject: subject,
                    html: template,
                    footerData: emailFooter?.html,
                    emailConfigData: emailConfig,
                });
            }
            res.status(200).json({ users, message: "email sent successfully" });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    emailCampaignView: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid airline id");
            }

            const emailCampaign = await EmailCampaign.findOne({
                _id: id,
                isDeleted: false,
            }).populate("campaignGroupId");

            const emailList = await EmailList.find({
                _id: emailCampaign?.emailListId,
                isDeleted: false,
            });

            const emailTemplate = await EmailTemplate.findOne({
                _id: emailCampaign.emailTemplateId,
                isDeleted: false,
            });

            const emailImages = await EmailImage.find({
                isDeleted: false,
            });

            if (emailTemplate?.type === "manual") {
                const filePath = emailTemplate.filePath;
                const currentDir = __dirname;
                const targetFilePath = path.resolve(currentDir, `../../../../${filePath}`);
                try {
                    const data = await readFileAsync(targetFilePath, "utf8");
                    emailTemplate.html = await replacePlaceholders(
                        data || "",
                        emailCampaign.tags || [],
                        emailImages
                    );
                } catch (err) {
                    console.error("Error reading file:", err);
                }
            } else {
                emailTemplate.html = emailTemplate?.html;
            }

            res.status(200).json({
                emailTemplate,
                emailList,
                emailCampaign,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    statusChangeEmail: async (req, res) => {
        try {
            const { id } = req.params;
            const { status } = req.body;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid email id");
            }

            const emailCampaign = await EmailCampaign.findOneAndUpdate(
                {
                    _id: id,
                    isDeleted: false,
                },
                {
                    $set: {
                        status: status,
                    },
                },
                {
                    new: true,
                }
            );

            if (!emailCampaign) {
                return sendErrorResponse(res, 404, "email list not found");
            }

            res.status(200).json({
                message: `email campaign ${status} successfully `,
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
