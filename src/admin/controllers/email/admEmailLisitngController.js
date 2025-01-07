const { sendErrorResponse } = require("../../../helpers");
const { B2cBanner, EmailList } = require("../../../models");
const { isValidObjectId } = require("mongoose");
const { emailListingSchema } = require("../../validations/email/emailListing.schema");
const { fetchUsers, readCsvFileAsync } = require("../../helpers/email/emailCampaignSenderHelper");
const xl = require("excel4node");
const fs = require("fs");
const path = require("path");
const { parse } = require("csv-parse");

module.exports = {
    addNewEmailList: async (req, res) => {
        try {
            const { name, type, recipientGroup, products, isCountries, countries } = req.body;

            const { _, error } = emailListingSchema.validate({
                ...req.body,
                products: products ? JSON.parse(products) : [],
                countries: countries ? JSON.parse(countries) : [],
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

            let parsedProducts;
            if (products) {
                parsedProducts = JSON.parse(products);
            }

            let parsedCountries;
            if (countries) {
                parsedCountries = JSON.parse(countries);
            }

            console.log(isCountries, parsedCountries, "parsedCountries");

            const emailList = new EmailList({
                name,
                type,
                filePath,
                recipientGroup,
                products: parsedProducts,
                isCountries,
                countries: parsedCountries,
            });

            await emailList.save();
            res.status(200).json(emailList);
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    updateEmailList: async (req, res) => {
        try {
            const { id } = req.params;

            const { name, type, recipientGroup, products, isCountries, countries } = req.body;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid airline id");
            }

            const { _, error } = emailListingSchema.validate({
                ...req.body,
                products: products ? JSON.parse(products) : [],
                countries: countries ? JSON.parse(countries) : [],
            });
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            let filePath;
            if (type === "manual") {
                console.log(req.file?.path, "req.file?.path");
                if (!req.file?.path) {
                    return sendErrorResponse(res, 400, "file is required");
                } else {
                    filePath = "/" + req.file.path.replace(/\\/g, "/");
                }
            }

            let parsedProducts;
            if (products) {
                parsedProducts = JSON.parse(products);
            }

            let parsedCountries;
            if (countries) {
                parsedCountries = JSON.parse(countries);
            }

            const emailList = await EmailList.findOneAndUpdate(
                { _id: id, isDeleted: false },
                {
                    name,
                    type,
                    filePath,
                    recipientGroup,
                    products: parsedProducts,
                    isCountries,
                    countries: parsedCountries,
                },
                { new: true, runValidators: true }
            );
            if (!emailList) {
                return sendErrorResponse(res, 404, "email list not found");
            }

            res.status(200).json(emailList);
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    deleteEmailList: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid email id");
            }

            const emailList = await EmailList.findOneAndDelete({
                _id: id,
                isDeleted: false,
            });
            if (!emailList) {
                return sendErrorResponse(res, 404, "email list not found");
            }

            res.status(200).json({
                message: "email list successfully deleted",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllEmailList: async (req, res) => {
        try {
            const { skip = 0, limit = 10, searchQuery } = req.query;

            const filters = { isDeleted: false };

            if (searchQuery && searchQuery !== "") {
                filters.name = { $regex: searchQuery, $options: "i" };
            }

            const emailLists = await EmailList.find(filters)
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalEmailLists = await EmailList.findOne(filters).count();

            res.status(200).json({
                emailLists,
                totalEmailLists,
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleEmailList: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid airline id");
            }

            const emailList = await EmailList.findOne({
                _id: id,
                isDeleted: false,
            });
            if (!emailList) {
                return sendErrorResponse(res, 404, "email list not found");
            }

            res.status(200).json(emailList);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getEmailLists: async (req, res) => {
        try {
            const filters = { isDeleted: false };

            const emailLists = await EmailList.find(filters)
                .sort({ createdAt: -1 })
                .select("name _id")
                .lean();

            res.status(200).json(emailLists || []);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    downloadEmailList: async (req, res) => {
        try {
            const { id } = req.params;
            const emailList = await EmailList.findOne({
                _id: id,
                isDeleted: false,
            });
            let users = [];

            if (emailList?.type === "manual") {
                const currentDir = __dirname;
                const targetFilePath = path.resolve(
                    currentDir,
                    `../../../../${emailList?.filePath}`
                );

                users = await readCsvFileAsync(targetFilePath, "utf8");
            } else {
                users = await fetchUsers(emailList);
            }

            var wb = new xl.Workbook();
            var ws = wb.addWorksheet("Orders");

            const titleStyle = wb.createStyle({
                font: {
                    bold: true,
                },
            });

            ws.cell(1, 1).string("Emails").style(titleStyle);

            for (let i = 0; i < users.length; i++) {
                const user = users[i];
                ws.cell(i + 2, 1).string(user || "N/A");
            }

            wb.write(`FileName.xlsx`, res);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getEmailList: async (req, res) => {
        try {
            const { id } = req.params;
            const emailList = await EmailList.findOne({
                _id: id,
                isDeleted: false,
            });
            let users = [];

            if (emailList?.type === "manual") {
                const currentDir = __dirname;
                const targetFilePath = path.resolve(
                    currentDir,
                    `../../../../${emailList?.filePath}`
                );

                users = await readCsvFileAsync(targetFilePath, "utf8");
            } else {
                users = await fetchUsers(emailList);
            }

            res.status(200).json(users || []);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
