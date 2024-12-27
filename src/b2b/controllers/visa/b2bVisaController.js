const { isValidObjectId, Types } = require("mongoose");
const { sendErrorResponse, sendMobileOtp } = require("../../../helpers");
const {
    VisaType,
    VisaApplication,
    Country,
    VisaDocument,
    VisaNationality,
} = require("../../../models");
const { generateUniqueString } = require("../../../utils");
const sendInsufficentBalanceMail = require("../../helpers/sendInsufficentBalanceEmail");
const sendAdminVisaApplicationEmail = require("../../helpers/sendVisaAdminEmail");
const sendApplicationEmail = require("../../helpers/sendVisaApplicationEmail");
const sendVisaOrderOtp = require("../../helpers/sendVisaOrderEmail");
const sendWalletDeductMail = require("../../helpers/sendWalletDeductMail");
const {
    B2BWallet,
    B2BTransaction,
    B2BSubAgentVisaMarkup,
    B2BClientVisaMarkup,
    B2BVisaApplication,
} = require("../../models");
const {
    visaApplicationSchema,
    visaReapplySchema,
} = require("../../validations/b2bVisaApplication.schema");

module.exports = {
    applyVisa: async (req, res) => {
        try {
            const { visaType, email, noOfAdult, noOfChild, travellers, nationality } = req.body;

            const { _, error } = visaApplicationSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(
                    res,
                    400,
                    error.details ? error?.details[0]?.message : error.message
                );
            }

            if (!isValidObjectId(visaType)) {
                return sendErrorResponse(res, 400, "Invalid visaType id");
            }

            const visaTypeDetails = await VisaType.findOne({
                _id: visaType,
                isDeleted: false,
            });

            if (!visaTypeDetails) {
                return sendErrorResponse(res, 400, "VisaType Not Found");
            }

            if (Number(noOfAdult) + Number(noOfChild) !== travellers.length) {
                return sendErrorResponse(res, 400, "PassengerDetails Not Added ");
            }

            const visaNationality = await VisaNationality.findOne({
                _id: nationality,
                isDeleted: false,
            });

            if (!visaNationality) {
                return sendErrorResponse(res, 404, "Visa Nationality not found");
            }

            console.log(visaNationality.visas, "visas");

            console.log(visaType, "visaType");

            const selectedVisaType = visaNationality.visas.find(
                (visa) =>
                    visa.visaType.toString() === visaType.toString() &&
                    visa.isDeleted === false &&
                    visa.createdFor === "b2b"
            );

            if (!selectedVisaType) {
                return sendErrorResponse(res, 404, "visa type not found");
            }

            let { adultPrice, childPrice, adultCost, childCost } = selectedVisaType;

            let totalAdultCost = 0;
            let totalChildCost = 0;
            let totalAdultPrice = 0;
            let totalChildPrice = 0;

            let adultProfit = Number(adultPrice - adultCost) * noOfAdult;

            let childProfit = Number(childPrice - childCost) * noOfAdult;

            let totalProfit = childProfit + adultProfit;

            let subAgentAdultMarkup = 0;
            let subAgentChildMarkup = 0;
            let clientAdultMarkup = 0;
            let clientChildMarkup = 0;
            let subAgentTotalMarkup = 0;
            let clientTotalMarkup = 0;

            if (req.reseller.role == "sub-agent") {
                let subAgentMarkup = await B2BSubAgentVisaMarkup.findOne({
                    reseller: req.reseller.referredBy,
                    visaType: visaType,
                });

                if (subAgentMarkup) {
                    if (subAgentMarkup?.markupType === "percentage") {
                        const markupAmount = subAgentMarkup.markup / 100;
                        subAgentAdultMarkup = adultPrice * (1 + markupAmount) - adultPrice;

                        subAgentChildMarkup = childPrice * (1 + markupAmount) - childPrice;

                        adultPrice = adultPrice * (1 + markupAmount);
                        childPrice = childPrice * (1 + markupAmount);
                    } else if (subAgentMarkup.markupType === "flat") {
                        subAgentAdultMarkup = subAgentMarkup.markup;
                        subAgentChildMarkup = subAgentMarkup.markup;

                        adultPrice = adultPrice + subAgentMarkup.markup;
                        childPrice = childPrice + subAgentMarkup.markup;
                    }
                }
                subAgentTotalMarkup =
                    subAgentChildMarkup * noOfChild + subAgentAdultMarkup * noOfAdult;
            }

            let clientMarkup = await B2BClientVisaMarkup.findOne({
                reseller: req.reseller._id,
                visaType: visaType,
            });

            console.log(clientMarkup, "clientmarkup");

            if (clientMarkup) {
                if (clientMarkup.markupType === "percentage") {
                    const markupAmount = clientMarkup.markup / 100;
                    clientAdultMarkup = adultPrice * (1 + markupAmount) - adultPrice;

                    clientChildMarkup = childPrice * (1 + markupAmount) - childPrice;

                    adultPrice = adultPrice * (1 + markupAmount);
                    childPrice = childPrice * (1 + markupAmount);
                } else if (clientMarkup.markupType === "flat") {
                    clientAdultMarkup = clientMarkup.markup;
                    clientChildMarkup = clientMarkup.markup;

                    adultPrice = adultPrice + clientMarkup.markup;
                    childPrice = childPrice + clientMarkup.markup;
                }
                clientTotalMarkup = clientChildMarkup * noOfChild + clientAdultMarkup * noOfAdult;
            }

            console.log("clentmarkup: " + clientTotalMarkup);

            console.log(req.reseller, "reseller");
            const countryDetail = await Country.findOne({
                isDeleted: false,
                _id: req.reseller.country,
            });

            if (!countryDetail) {
                return sendErrorResponse(res, 404, "country not found");
            }

            const otp = await sendMobileOtp(countryDetail.phonecode, req.reseller.phoneNumber);

            // const updatedTravellers = travellers.map((traveller) => {
            //   traveller.amount.push(totalAmount / noOfTravellers);
            //   return traveller;
            // });

            await sendVisaOrderOtp(req.reseller.email, "Visa Application Order Otp", otp);

            totalAdultPrice = adultPrice * noOfAdult;
            totalChildPrice = childPrice * noOfChild;
            totalAdultCost = adultCost * noOfAdult;
            totalChildCost = childCost * noOfChild;

            const newVisaApplication = new B2BVisaApplication({
                visaType,
                nationality: visaNationality._id,
                totalAdultPrice,
                totalChildPrice,
                totalAmount: totalAdultPrice + totalChildPrice,
                totalAdultCost,
                totalChildCost,
                totalCost: adultCost + childCost,
                profit: totalProfit,
                email: travellers[0]?.email,
                contactNo: travellers[0]?.contactNo,
                noOfAdult,
                noOfChild,
                travellers,
                otp: 12345,
                subAgentTotalMarkup,
                clientTotalMarkup,
                reseller: req.reseller?._id,
                orderedBy: req.reseller.role,
                referenceNumber: generateUniqueString("B2BVSA"),
            });

            await newVisaApplication.save();

            res.status(200).json({ _id: newVisaApplication._id, message: "visa order initated" });
        } catch (err) {
            console.log(err, "error");
            sendErrorResponse(res, 500, err);
        }
    },

    completeVisaPaymentOrder: async (req, res) => {
        try {
            const { orderId } = req.params;
            const { otp } = req.body;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            const VisaApplicationOrder = await B2BVisaApplication.findOne({
                _id: orderId,
                reseller: req.reseller._id,
            });
            if (!VisaApplicationOrder) {
                return sendErrorResponse(res, 404, "visa application  not found");
            }

            // if (VisaApplicationOrder.onwardDate <= new Date) {
            //     return sendErrorResponse(
            //         res,
            //         400,
            //         "sorry, visa onward date if experied!"
            //     );
            // }

            if (VisaApplicationOrder.status === "payed") {
                return sendErrorResponse(res, 400, "sorry, you have already completed this order!");
            }

            if (!VisaApplicationOrder.otp || VisaApplicationOrder.otp !== Number(otp)) {
                return sendErrorResponse(res, 400, "incorrect otp!");
            }

            let totalAmount = VisaApplicationOrder.totalAmount;

            let wallet = await B2BWallet.findOne({
                reseller: req.reseller?._id,
            });

            let reseller = req.reseller;
            if (!wallet || wallet.balance < totalAmount) {
                sendInsufficentBalanceMail(reseller);
                return sendErrorResponse(
                    res,
                    400,
                    "Insufficient balance. please reacharge and try again"
                );
            }

            const transaction = new B2BTransaction({
                reseller: req.reseller?._id,
                paymentProcessor: "wallet",
                product: "visa",
                processId: VisaApplicationOrder?._id,
                description: `visa booking payment`,
                debitAmount: totalAmount,
                creditAmount: 0,
                directAmount: 0,
                closingBalance: wallet.balance,
                dueAmount: wallet.creditUsed,
                remark: "Visa booking payment",
                dateTime: new Date(),
            });

            if (totalAmount > 0) {
                wallet.balance -= totalAmount;
                await wallet.save();
            }

            transaction.status = "success";
            await transaction.save();

            if (req.reseller.role === "sub-agent") {
                let wallet = await B2BWallet.findOne({
                    reseller: req.reseller?.referredBy,
                });

                if (VisaApplicationOrder?.subAgentTotalMarkup > 0) {
                    wallet.balance += VisaApplicationOrder?.subAgentTotalMarkup;
                    await wallet.save();

                    const transaction = new B2BTransaction({
                        reseller: req.reseller?.referredBy,
                        paymentProcessor: "wallet",
                        product: "visa",
                        processId: VisaApplicationOrder?._id,
                        description: `visa booking payment`,
                        debitAmount: totalAmount,
                        creditAmount: 0,
                        directAmount: 0,
                        closingBalance: wallet.balance,
                        dueAmount: wallet.creditUsed,
                        remark: "Visa booking payment",
                        dateTime: new Date(),
                    });

                    await transaction.save();
                }
            }

            if (VisaApplicationOrder?.clientTotalMarkup > 0) {
                wallet.balance += VisaApplicationOrder?.clientTotalMarkup;
                await wallet.save();

                const transaction = new B2BTransaction({
                    reseller: req.reseller?._id,
                    paymentProcessor: "wallet",
                    product: "visa",
                    processId: VisaApplicationOrder?._id,
                    description: `visa booking payment`,
                    debitAmount: totalAmount,
                    creditAmount: 0,
                    directAmount: 0,
                    closingBalance: wallet.balance,
                    dueAmount: wallet.creditUsed,
                    remark: "Visa booking payment",
                    dateTime: new Date(),
                });

                await transaction.save();
            }

            VisaApplicationOrder.status = "payed";

            await VisaApplicationOrder.save();

            res.status(200).json({
                message: "Amount Paided successfully ",
                _id: VisaApplicationOrder._id,
            });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    completeVisaDocumentOrder: async (req, res) => {
        try {
            const { orderId, travellerId } = req.params;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            const visaApplication = await B2BVisaApplication.findOne({
                _id: orderId,
                reseller: req.reseller._id,
            }).populate({
                path: "visaType",
                populate: { path: "visa", populate: { path: "country" } },
            });

            if (!visaApplication) {
                return sendErrorResponse(res, 404, "Visa Application Not Found");
            }

            if (!visaApplication.status === "payed") {
                return sendErrorResponse(res, 404, "Visa Application Not Payed");
            }

            if (
                req.files?.["passportFistPagePhoto"]?.length !== 1 ||
                req.files?.["passportLastPagePhoto"]?.length !== 1
            ) {
                return sendErrorResponse(res, 400, "Please upload passport first and last page .");
            }

            // async function insertPhotos(numPersons, numPhotos) {
            //   let persons = [];
            //   let startIndex = 0;
            //   let promises = [];
            //   for (let i = 0; i < numPersons; i++) {
            //     let person = {};
            //     for (let j = 0; j < numPhotos; j++) {
            //       let photoIndex = startIndex + j;
            //       person[`photo${j + 1}`] =
            //         "/" + req.files[photoIndex]?.path?.replace(/\\/g, "/");
            //     }

            //     console.log(person, "person");
            //     const visaDocument = new VisaDocument({
            //       passportFistPagePhoto: person.photo1,
            //       passportLastPagePhoto: person.photo2,
            //       passportSizePhoto: person.photo3,
            //     });

            //     promises.push(
            //       new Promise((resolve, reject) => {
            //         visaDocument.save((error, document) => {
            //           if (error) {
            //             return reject(error);
            //           }

            //           console.log(document, "document");

            //           visaApplication.travellers[i].documents = document._id;
            //           resolve();
            //         });
            //       })
            //     );

            //     persons.push(person);
            //     startIndex += numPhotos;
            //   }

            //   await Promise.all(promises);
            //   return persons;
            // }

            // let persons = await insertPhotos(visaApplication.noOfTravellers, 3);

            const passportFirstPagePhotos = req.files["passportFistPagePhoto"];
            const passportLastPagePhotos = req.files["passportLastPagePhoto"];
            const passportSizePhotos = req.files["passportSizePhoto"];
            const supportiveDoc1s = req.files["supportiveDoc1"];
            const supportiveDoc2s = req.files["supportiveDoc2"];

            const photos = [];
            let promises = [];

            let passengerIndex = visaApplication.travellers.findIndex((traveller) => {
                return traveller?._id?.toString() === travellerId?.toString();
            });

            if (passengerIndex == -1) {
                return sendErrorResponse(res, 400, "passenger not found to upload documents");
            }

            if (visaApplication?.travellers[passengerIndex]?.isStatus !== "initiated") {
                return sendErrorResponse(res, 400, "passenger already uploaded documents");
            }

            const visaDocument = new VisaDocument({
                passportFistPagePhoto: "/" + passportFirstPagePhotos[0]?.path?.replace(/\\/g, "/"),
                passportLastPagePhoto: "/" + passportLastPagePhotos[0]?.path?.replace(/\\/g, "/"),
                passportSizePhoto: passportSizePhotos
                    ? "/" + passportSizePhotos[0]?.path?.replace(/\\/g, "/")
                    : "",
                supportiveDoc1: supportiveDoc1s
                    ? "/" + supportiveDoc1s[0]?.path?.replace(/\\/g, "/")
                    : "",
                supportiveDoc2: supportiveDoc2s
                    ? "/" + supportiveDoc2s[0]?.path?.replace(/\\/g, "/")
                    : "",
            });

            promises.push(
                new Promise((resolve, reject) => {
                    visaDocument.save((error, document) => {
                        if (error) {
                            return reject(error);
                        }

                        visaApplication.travellers[passengerIndex].documents = document._id;
                        visaApplication.travellers[passengerIndex].isStatus = "submitted";

                        resolve();
                    });
                })
            );

            await Promise.all(promises);

            // for (let i = 0; i < passportFirstPagePhotos.length; i++) {
            //     const visaDocument = new VisaDocument({
            //         passportFistPagePhoto:
            //             "/" + passportFirstPagePhotos[i]?.path?.replace(/\\/g, "/"),
            //         passportLastPagePhoto:
            //             "/" + passportLastPagePhotos[i]?.path?.replace(/\\/g, "/"),
            //         passportSizePhoto: "/" + passportSizePhotos[i]?.path?.replace(/\\/g, "/"),
            //         supportiveDoc1: "/" + supportiveDoc1s[i]?.path?.replace(/\\/g, "/"),
            //         supportiveDoc2: "/" + supportiveDoc2s[i]?.path?.replace(/\\/g, "/"),
            //     });

            //     promises.push(
            //         new Promise((resolve, reject) => {
            //             visaDocument.save((error, document) => {
            //                 if (error) {
            //                     return reject(error);
            //                 }

            //                 visaApplication.travellers[i].documents = document._id;
            //                 visaApplication.travellers[i].isStatus = "submitted";
            //                 resolve();
            //             });
            //         })
            //     );
            // }

            // await Promise.all(promises);

            // visaApplication.isDocumentUplaoded = true;
            // visaApplication.status = "submitted";
            // await sendApplicationEmail(req.reseller.email, visaApplication);
            // await sendAdminVisaApplicationEmail(visaApplication);

            await visaApplication.save();

            res.status(200).json({
                travellerId,
                isStatus: "submitted",
                message: "documents uploaded successfully",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    completeAllDocumentUpload: async (req, res) => {
        try {
            const { orderId } = req.params;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            const visaApplication = await B2BVisaApplication.findOne({
                _id: orderId,
            });

            if (visaApplication?.isDocumentUploaded === true) {
                return sendErrorResponse(res, 400, `documents already submitted  `);
            }

            for (let index = 0; index < visaApplication.travellers.length; index++) {
                const traveller = visaApplication.travellers[index];
                if (traveller?.isStatus === "initiated") {
                    return sendErrorResponse(
                        res,
                        400,
                        `document not submitted for traveller ${index + 1}`
                    );
                }
            }

            visaApplication.isDocumentUploaded = true;
            await visaApplication.save();

            res.status(200).json({
                orderId,
                message: "documents uploaded for all travellers",
            });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    completeVisaReapplyDocumentOrder: async (req, res) => {
        try {
            const { travellerId } = req.params;
            const { orderId } = req.params;
            const {
                title,
                firstName,
                lastName,
                dateOfBirth,
                expiryDate,
                country,
                passportNo,
                contactNo,
                email,
            } = req.body;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            if (!isValidObjectId(travellerId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            // const { _, error } = visaReapplySchema.validate(req.body);
            // if (error) {
            //   return sendErrorResponse(
            //     res,
            //     400,
            //     error.details ? error?.details[0]?.message : error.message
            //   );
            // }

            let parsedDateOfBirth;
            if (dateOfBirth) {
                parsedDateOfBirth = JSON.parse(dateOfBirth);
            }

            let parsedExpiryDate;
            if (dateOfBirth) {
                parsedExpiryDate = JSON.parse(expiryDate);
            }

            const visaApplication = await VisaApplication.findOne({
                _id: orderId,
                reseller: req.reseller._id,
            }).populate({
                path: "visaType",
                populate: { path: "visa", populate: { path: "country" } },
            });

            if (!visaApplication) {
                return sendErrorResponse(res, 404, "Visa Application Not Found");
            }
            if (!visaApplication.status === "payed") {
                return sendErrorResponse(res, 404, "Visa Application Amount Not Payed");
            }

            if (
                !req.files ||
                !req.files["passportFistPagePhoto"] ||
                req.files["passportFistPagePhoto"].length === 0
            ) {
                return sendErrorResponse(res, 400, "Please Upload Fist Page Photo ");
            }

            if (
                !req.files ||
                !req.files["passportLastPagePhoto"] ||
                req.files["passportLastPagePhoto"].length === 0
            ) {
                return sendErrorResponse(res, 400, "Please Upload LastPage Photo ");
            }

            if (
                !req.files ||
                !req.files["passportSizePhoto"] ||
                req.files["passportSizePhoto"].length === 0
            ) {
                return sendErrorResponse(res, 400, "Please Upload Passport Size Photo ");
            }

            if (
                !req.files ||
                !req.files["supportiveDoc1"] ||
                req.files["supportiveDoc1"].length === 0
            ) {
                return sendErrorResponse(res, 400, "Please Upload Supportive Doc ");
            }

            const passportFirstPagePhotos = req.files["passportFistPagePhoto"];
            const passportLastPagePhotos = req.files["passportLastPagePhoto"];
            const passportSizePhotos = req.files["passportSizePhoto"];
            const supportiveDoc1s = req.files["supportiveDoc1"];
            const supportiveDoc2s = req.files["supportiveDoc2"];

            const photos = [];
            let promises = [];

            // for (let i = 0; i < passportFirstPagePhotos.length; i++) {
            const visaDocument = new VisaDocument({
                passportFistPagePhoto: "/" + passportFirstPagePhotos[0]?.path?.replace(/\\/g, "/"),
                passportLastPagePhoto: "/" + passportLastPagePhotos[0]?.path?.replace(/\\/g, "/"),
                passportSizePhoto: "/" + passportSizePhotos[0]?.path?.replace(/\\/g, "/"),
                supportiveDoc1: "/" + supportiveDoc1s[0]?.path?.replace(/\\/g, "/"),
                supportiveDoc2: "/" + supportiveDoc2s[0]?.path?.replace(/\\/g, "/"),
            });

            promises.push(
                new Promise((resolve, reject) => {
                    visaDocument.save(async (error, document) => {
                        if (error) {
                            return reject(error);
                        }

                        let upload = await VisaApplication.updateOne(
                            {
                                _id: orderId,
                                "travellers._id": travellerId,
                            },
                            {
                                $set: {
                                    "travellers.$.documents": document._id,
                                    "travellers.$.title": title,
                                    "travellers.$.firstName": firstName,
                                    "travellers.$.lastName": lastName,
                                    "travellers.$.dateOfBirth": parsedDateOfBirth,
                                    "travellers.$.expiryDate": parsedExpiryDate,
                                    "travellers.$.country": country,
                                    "travellers.$.passportNo": passportNo,
                                    "travellers.$.contactNo": contactNo,
                                    "travellers.$.email": email,
                                    "travellers.$.isStatus": "submitted",
                                },
                            }
                        );

                        resolve();
                    });
                })
            );
            // }

            await Promise.all(promises);

            await visaApplication.save();

            res.status(200).json({ success: "visa submitted " });
        } catch (err) {
            console.log(err, "error");
            sendErrorResponse(res, 500, err);
        }
    },

    visaApplicationInvoice: async (req, res) => {
        try {
            const { orderId } = req.params;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            const visaApplication = await VisaApplication.findOne({
                _id: orderId,
                reseller: req.reseller._id,
            }).populate({
                path: "visaType",
                populate: { path: "visa", populate: { path: "country" } },
            });

            if (!visaApplication) {
                return sendErrorResponse(res, 404, "visa application  not found");
            }

            res.status(200).json(visaApplication);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
