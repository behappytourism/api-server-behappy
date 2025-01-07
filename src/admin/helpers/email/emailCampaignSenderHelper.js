const {
    EmailCampaign,
    EmailList,
    EmailTemplate,
    EmailImage,
    User,
    EmailCampaignGroup,
} = require("../../../models");
const fs = require("fs");
const path = require("path");
const ejs = require("ejs");
const { parse } = require("csv-parse");
const sendCampaignEmail = require("./sendCampaginEmail");
const { Reseller, ResellerConfiguration } = require("../../../b2b/models");
const { Admin } = require("../../models");
const md5 = require("md5");

const productAccessMap = {
    attraction: "showAttraction",
    a2a: "showA2a",
    flight: "showFlight",
    hotel: "showHotel",
    visa: "showVisa",
};

const sendEmailCampaignPromotions = async () => {
    try {
        const currentDate = new Date();
        currentDate.setHours(currentDate.getHours() + 4);
        let hour = currentDate.getHours();
        let min = currentDate.getMinutes();
        console.log(hour, "hour", min, "min");

        const emailCampaignGroups = await EmailCampaignGroup.find({
            isDeleted: false,
        });

        const emailImages = await EmailImage.find({
            isDeleted: false,
        });

        const processCampaignGroups = async (emailCampaignGroups, hour, min, date) => {
            await Promise.all(
                emailCampaignGroups.map((emailCampaignGroup) =>
                    processEmailCampaign(emailCampaignGroup, hour, emailImages, min, date)
                )
            );
        };

        processCampaignGroups(emailCampaignGroups, hour, min)
            .then(() => console.log())
            .catch((err) => console.error("Error processing campaigns:", err));
    } catch (e) {
        console.log(e);
    }
};

const processEmailCampaign = async (emailCampaignGroup, hour, emailImages, min, date) => {
    try {
        const date = new Date();

        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, "0");
        const day = String(date.getUTCDate()).padStart(2, "0");
        const dateOnlyString = `${year}-${month}-${day}`;

        const query = {
            campaignGroupId: emailCampaignGroup?._id,
            hour,
            isDeleted: false,
            hour,
            // min: min,
            date: dateOnlyString,
        };

        const update = {
            $set: { status: "started" },
        };

        const emailCampaigns = await EmailCampaign.find({ ...query, status: "scheduled" }).populate(
            "emailFooterId emailConfigId"
        );
        await EmailCampaign.updateMany({ ...query, status: "scheduled" }, update);

        await Promise.all(
            emailCampaigns.map(async (emailCampaign) => {
                let users = [];
                let template = "";

                const emailList = await EmailList.findOne({
                    _id: emailCampaign?.emailListId,
                    isDeleted: false,
                });

                if (emailList?.type === "manual") {
                    const currentDir = __dirname;
                    const targetFilePath = path.resolve(
                        currentDir,
                        `../../../../${emailList?.filePath}`
                    );
                    users = await readCsvFileAsync(targetFilePath);
                } else {
                    users = await fetchUsers(emailList);
                }

                const emailTemplate = await EmailTemplate.findOne({
                    _id: emailCampaign.emailTemplateId,
                    isDeleted: false,
                });

                if (emailTemplate?.type === "manual") {
                    const filePath = emailTemplate.filePath;
                    const currentDir = __dirname;
                    const targetFilePath = path.resolve(currentDir, `../../../../${filePath}`);
                    try {
                        const data = await readFileAsync(targetFilePath, "utf8");
                        template = await replacePlaceholders(
                            data || "",
                            emailCampaign.tags || [],
                            emailImages
                        );
                    } catch (err) {
                        console.error("Error reading file:", err);
                    }
                } else {
                    template = emailTemplate?.html;
                }

                let uniqueUsers = [...new Set(users)];

                uniqueUsers = uniqueUsers.map((email) => ({
                    hashedEmail: md5(email),
                    email: email,
                }));

                await Promise.all(
                    uniqueUsers.map((user) =>
                        sendCampaignEmail({
                            email: user.email,
                            subject: emailCampaign.subject,
                            html: template,
                            hashedCampaignId: emailCampaign.hashedCampaignId,
                            hashedEmail: user.hashedEmail,
                            footerData: emailCampaign?.emailFooterId?.html,
                            emailConfigData: emailCampaign?.emailConfigId,
                        })
                    )
                );

                await EmailCampaign.updateOne(
                    { _id: emailCampaign._id, status: "started" },
                    {
                        $set: { status: "completed", emails: uniqueUsers },
                    }
                );
            })
        );
    } catch (err) {
        console.log(err);
    }
};

const readCsvFileAsync = (filePath) => {
    return new Promise((resolve, reject) => {
        const userEmails = [];
        fs.createReadStream(filePath)
            .pipe(parse({ delimiter: "," }))
            .on("data", (csvrow) => {
                userEmails.push(csvrow[0]);
            })
            .on("end", () => resolve(userEmails))
            .on("error", (err) => reject(err));
    });
};

const readFileAsync = (filePath, encoding) => {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, encoding, (err, data) => {
            if (err) reject(err);
            else resolve(data);
        });
    });
};

const fetchUsers = async (emailList) => {
    try {
        let users = [];
        let recipient = emailList?.recipientGroup;

        if (recipient === "b2c") {
            const b2cUsers = await User.find({ isDeleted: false }).select("email");
            users = b2cUsers.map((user) => user.email);
        } else if (recipient === "b2b") {
            const b2bUsers = await Reseller.find({ isDeleted: false }).select("email");

            const promises = b2bUsers.map(async (user) => {
                const b2bAccessUser = await ResellerConfiguration.findOne({
                    reseller: user._id,
                    isDeleted: false,
                });

                if (!b2bAccessUser) {
                    return null;
                }

                for (const product of emailList?.products || []) {
                    const accessProperty = productAccessMap[product];

                    if (accessProperty && b2bAccessUser[accessProperty]) {
                        return user.email;
                    }
                }

                return null;
            });

            const results = await Promise.all(promises);

            users = results.filter((user) => user !== null);
        } else if (recipient === "admin") {
            const admins = await Admin.find({ isDeleted: false }).select("email");
            users = admins.map((user) => user.email);
        }

        return users;
    } catch (err) {
        console.log(err);
    }
};

const replacePlaceholders = (template, replacements, images) => {
    try {
        let result = template;

        replacements?.forEach(({ key, value, image, type }) => {
            const regex = new RegExp(`<%= ${key} %>`, "g");
            let img = images?.find((img) => img?._id?.toString() == image?.toString())?.image;
            result = result.replace(
                regex,
                type !== "image" ? value : `${process.env.SERVER_URL}${img}`
            );
        });
        return result;
    } catch (e) {
        console.log(e);
    }
};

module.exports = {
    fetchUsers,
    sendEmailCampaignPromotions,
    replacePlaceholders,
    readFileAsync,
    readCsvFileAsync,
};
