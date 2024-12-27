const { isValidObjectId, Types } = require("mongoose");
const sendVisaOrderOtp = require("../../../b2b/helpers/sendVisaOrderEmail");
const {
    Reseller,
    B2BMarkupProfile,
    B2BVisaApplication,
    B2BWallet,
    B2BTransaction,
} = require("../../../b2b/models");
const { visaApplicationSchema } = require("../../../b2b/validations/b2bVisaApplication.schema");
const { sendErrorResponse, sendMobileOtp, sendVisaApplicationEmail } = require("../../../helpers");
const {
    VisaType,
    VisaApplication,
    Visa,
    Country,
    VisaDocument,
    VisaNationality,
} = require("../../../models");
const { generateUniqueString } = require("../../../utils");
const { MarketStrategy } = require("../../models");

module.exports = {
    listAllCountry: async (req, res) => {
        try {
            const visaCountry = await Visa.aggregate([
                {
                    $match: {
                        isDeleted: false,
                    },
                },
                {
                    $lookup: {
                        from: "countries", // Replace 'countries' with the actual name of the collection you want to join
                        localField: "country", // Field in the 'Visa' collection
                        foreignField: "_id", // Field in the 'countries' collection
                        as: "countryInfo", // Alias for the joined data
                    },
                },
                {
                    $set: {
                        countryName: { $arrayElemAt: ["$countryInfo.countryName", 0] },
                    },
                },
                {
                    $project: {
                        countryName: 1,
                    },
                },
            ]);

            if (!visaCountry) {
                return sendErrorResponse(res, 400, "No Visa Available");
            }

            res.status(200).json(visaCountry);
        } catch (err) {
            console.log(err, "error");
            sendErrorResponse(res, 500, err);
        }
    },

    listAllNationality: async (req, res) => {
        try {
            const visaNationalities = await VisaNationality.aggregate([
                {
                    $match: { isDeleted: false },
                },
                {
                    $lookup: {
                        from: "countries", // Assuming the collection name is 'nationalities'
                        localField: "nationality",
                        foreignField: "_id",
                        as: "nationality",
                    },
                },
                {
                    $unwind: "$nationality",
                },
                {
                    $project: {
                        slug: 1,
                        nationality: "$nationality.countryName",
                    },
                },
            ]);

            if (!visaNationalities) {
                return sendErrorResponse(res, 400, "No Visa Nationalities Found ");
            }

            res.status(200).json(visaNationalities);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    listVisaType: async (req, res) => {
        try {
            const { visaId, nationalityId, resellerId } = req.params;

            if (!isValidObjectId(visaId)) {
                return sendErrorResponse(res, 400, "Invalid Visa id");
            }

            if (!isValidObjectId(nationalityId)) {
                return sendErrorResponse(res, 400, "Invalid nationality id");
            }

            const reseller = await Reseller.findOne({ isDeleted: false, _id: resellerId }).populate(
                "marketStrategy"
            );

            if (!reseller) {
                return sendErrorResponse(res, 400, "reseller not found!");
            }

            let visa = await Visa.findOne({
                _id: visaId,
                isDeleted: false,
            }).populate("country");

            if (!visa) {
                return sendErrorResponse(res, 400, "No Visa ");
            }

            let visaTypes = await VisaNationality.aggregate([
                {
                    $match: {
                        _id: Types.ObjectId(nationalityId),
                        isDeleted: false,
                    },
                },
                {
                    $unwind: "$visas",
                },
                {
                    $match: {
                        "visas.isDeleted": false,
                        "visas.createdFor": "b2b",
                    },
                },
                {
                    $lookup: {
                        from: "visatypes",
                        localField: "visas.visaType",
                        foreignField: "_id",
                        as: "visaType",
                    },
                },

                {
                    $set: {
                        visaType: { $arrayElemAt: ["$visaType", 0] },
                    },
                },
                {
                    $set: {
                        "visaType.adultPrice": "$visas.adultPrice", // Use correct field path
                        "visaType.childPrice": "$visas.childPrice", // Use correct field path
                    },
                },
                {
                    $match: {
                        "visaType.visa": Types.ObjectId(visa._id), // Use correct field path
                        "visaType.isDeleted": false,
                    },
                },
                {
                    $replaceRoot: {
                        newRoot: "$visaType",
                    },
                },
            ]);

            if (!visaTypes || visaTypes.length < 1) {
                return sendErrorResponse(res, 400, "No Visa Types Found ");
            }

            let market = await MarketStrategy.findOne({ _id: reseller?.marketStrategy });
            let b2bMarkupProfile = await B2BMarkupProfile.findOne({ resellerId: reseller?._id });

            visaTypes = visaTypes?.map((visaType) => {
                let { adultPrice, childPrice } = visaType;

                const marketMarkup = market?.visa?.find(
                    (markup) => markup?.visa?.toString() === visaType?._id?.toString()
                );

                if (marketMarkup) {
                    if (marketMarkup?.markupType === "percentage") {
                        const markupAmount = marketMarkup.markup / 100;
                        adultPrice = adultPrice * (1 + markupAmount);
                        childPrice = childPrice * (1 + markupAmount);
                    } else if (marketMarkup.markupType === "flat") {
                        childPrice = childPrice + marketMarkup.markup;
                        adultPrice = adultPrice + marketMarkup.markup;
                    }
                }

                const profileMarkup = b2bMarkupProfile?.visa?.find(
                    (markup) => markup?.visa?.toString() === visaType?._id?.toString()
                );

                if (profileMarkup) {
                    if (profileMarkup?.markupType === "percentage") {
                        const markupAmount = profileMarkup.markup / 100;
                        adultPrice = adultPrice * (1 + markupAmount);
                        childPrice = childPrice * (1 + markupAmount);
                    } else if (profileMarkup.markupType === "flat") {
                        childPrice = childPrice + profileMarkup.markup;
                        adultPrice = adultPrice + profileMarkup.markup;
                    }
                }

                delete visaType.markupClient;
                delete visaType.markupSubAgent;
                delete visaType.b2bMarkupProfile;

                return {
                    ...visaType,
                    adultPrice,
                    childPrice,
                };
            });

            res.status(200).json(visaTypes);
        } catch (err) {
            console.log(err, "err");
            sendErrorResponse(res, 500, err);
        }
    },

    applyVisa: async (req, res) => {
        try {
            const { visaType, email, noOfAdult, noOfChild, travellers, nationality } = req.body;
            const { resellerId } = req.params;

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
            const reseller = await Reseller.findOne({ isDeleted: false, _id: resellerId });

            if (!reseller) {
                return sendErrorResponse(res, 400, "reseller not found!");
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

            let childProfit = Number(childPrice - childCost) * noOfChild;

            let marketAdultMarkup = 0;
            let marketChildMarkup = 0;
            let profileAdultMarkup = 0;
            let profileChildMarkup = 0;
            let marketTotalMarkup = 0;
            let profileTotalMarkup = 0;

            let market = await MarketStrategy.findOne({ _id: reseller?.marketStrategy });
            let b2bMarkupProfile = await B2BMarkupProfile.findOne({ resellerId: reseller?._id });
            const marketMarkup = market?.visa?.find(
                (markup) => markup?.visa?.toString() === visaType?._id?.toString()
            );

            if (marketMarkup) {
                if (marketMarkup.markupType === "percentage") {
                    const markupAmount = marketMarkup.markup / 100;
                    marketAdultMarkup = adultPrice * (1 + markupAmount) - adultPrice;

                    marketChildMarkup = childPrice * (1 + markupAmount) - childPrice;

                    adultPrice = adultPrice * (1 + markupAmount);
                    childPrice = childPrice * (1 + markupAmount);
                } else if (marketMarkup.markupType === "flat") {
                    marketAdultMarkup = marketMarkup.markup;
                    marketChildMarkup = marketMarkup.markup;

                    adultPrice = adultPrice + marketMarkup.markup;
                    childPrice = childPrice + marketMarkup.markup;
                }
                marketTotalMarkup = marketChildMarkup * noOfChild + marketAdultMarkup * noOfAdult;
            }

            const profileMarkup = b2bMarkupProfile?.visa?.find(
                (markup) => markup?.visa?.toString() === visaType?._id?.toString()
            );

            if (profileMarkup) {
                if (profileMarkup.markupType === "percentage") {
                    const markupAmount = profileMarkup.markup / 100;
                    profileAdultMarkup = adultPrice * (1 + markupAmount) - adultPrice;
                    profileChildMarkup = childPrice * (1 + markupAmount) - childPrice;

                    adultPrice = adultPrice * (1 + markupAmount);
                    childPrice = childPrice * (1 + markupAmount);
                } else if (profileMarkup.markupType === "flat") {
                    profileAdultMarkup = profileMarkup.markup;
                    profileChildMarkup = profileMarkup.markup;

                    adultPrice = adultPrice + profileMarkup.markup;
                    childPrice = childPrice + profileMarkup.markup;
                }
                profileTotalMarkup =
                    profileChildMarkup * noOfChild + profileAdultMarkup * noOfAdult;
            }

            const countryDetail = await Country.findOne({
                isDeleted: false,
                _id: reseller.country,
            });

            if (!countryDetail) {
                return sendErrorResponse(res, 404, "country not found");
            }

            const otp = await sendMobileOtp(countryDetail.phonecode, reseller.phoneNumber);

            // const updatedTravellers = travellers.map((traveller) => {
            //   traveller.amount.push(totalAmount / noOfTravellers);
            //   return traveller;
            // });

            await sendVisaOrderOtp(reseller.email, "Visa Application Order Otp", otp);

            totalAdultPrice = adultPrice * noOfAdult;
            totalChildPrice = childPrice * noOfChild;
            totalAdultCost = adultCost * noOfAdult;
            totalChildCost = childCost * noOfChild;
            let totalProfit = childProfit + adultProfit + marketTotalMarkup + profileTotalMarkup;

            const newVisaApplication = new B2BVisaApplication({
                visaType,
                nationality: visaNationality._id,
                totalAdultPrice,
                totalChildPrice,
                totalAmount: totalAdultPrice + totalChildCost,
                totalAdultCost,
                totalChildCost,
                totalCost: totalAdultCost + childCost,
                profit: totalProfit,
                email: travellers[0]?.email,
                contactNo: travellers[0]?.contactNo,
                noOfAdult,
                noOfChild,
                travellers,
                otp: 12345,
                marketTotalMarkup,
                profileTotalMarkup,
                reseller: reseller?._id,
                orderedBy: reseller.role,
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
            const { otp = 12345 } = req.body;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            const VisaApplicationOrder = await B2BVisaApplication.findOne({
                _id: orderId,
                // reseller: req.reseller._id,
            });
            if (!VisaApplicationOrder) {
                return sendErrorResponse(res, 404, "visa application  not found");
            }

            const reseller = await Reseller.findOne({
                isDeleted: false,
                _id: VisaApplicationOrder.reseller,
            });

            if (!reseller) {
                return sendErrorResponse(res, 400, "reseller not found!");
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
                reseller: reseller?._id,
            });

            if (!wallet || wallet.balance < totalAmount) {
                sendInsufficentBalanceMail(reseller);
                return sendErrorResponse(
                    res,
                    400,
                    "Insufficient balance. please reacharge and try again"
                );
            }

            const transaction = new B2BTransaction({
                reseller: reseller?._id,
                transactionType: "deduct",
                status: "pending",
                paymentProcessor: "wallet",
                amount: totalAmount,
                order: orderId,
            });

            if (totalAmount > 0) {
                wallet.balance -= totalAmount;
                await wallet.save();
            }

            transaction.status = "success";
            await transaction.save();

            if (reseller.role === "sub-agent") {
                let wallet = await B2BWallet.findOne({
                    reseller: reseller?.referredBy,
                });

                if (VisaApplicationOrder?.subAgentTotalMarkup > 0) {
                    wallet.balance += VisaApplicationOrder?.subAgentTotalMarkup;
                    await wallet.save();

                    const transaction = new B2BTransaction({
                        reseller: req.reseller?.referredBy,
                        transactionType: "markup",
                        orderItem: orderId,
                        status: "success",
                        paymentProcessor: "wallet",
                        amount: VisaApplicationOrder?.subAgentMarkup,
                        order: orderId,
                    });

                    await transaction.save();
                }
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
            const { orderId } = req.params;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            const visaApplication = await B2BVisaApplication.findOne({
                _id: orderId,
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

            const reseller = await Reseller.findOne({
                isDeleted: false,
                _id: visaApplication.reseller,
            });

            if (!reseller) {
                return sendErrorResponse(res, 400, "reseller not found!");
            }

            if (
                req.files["passportFistPagePhoto"].length !==
                Number(visaApplication?.noOfAdult + visaApplication?.noOfChild)
            ) {
                return sendErrorResponse(res, 400, "Please Upload all Documents ");
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

            for (let i = 0; i < passportFirstPagePhotos.length; i++) {
                const visaDocument = new VisaDocument({
                    passportFistPagePhoto:
                        "/" + passportFirstPagePhotos[i]?.path?.replace(/\\/g, "/"),
                    passportLastPagePhoto:
                        "/" + passportLastPagePhotos[i]?.path?.replace(/\\/g, "/"),
                    passportSizePhoto: "/" + passportSizePhotos[i]?.path?.replace(/\\/g, "/"),
                    supportiveDoc1: "/" + supportiveDoc1s[i]?.path?.replace(/\\/g, "/"),
                    supportiveDoc2: "/" + supportiveDoc2s[i]?.path?.replace(/\\/g, "/"),
                });

                promises.push(
                    new Promise((resolve, reject) => {
                        visaDocument.save((error, document) => {
                            if (error) {
                                return reject(error);
                            }

                            visaApplication.travellers[i].documents = document._id;
                            visaApplication.travellers[i].isStatus = "submitted";
                            resolve();
                        });
                    })
                );
            }

            await Promise.all(promises);

            // visaApplication.isDocumentUplaoded = true;
            // visaApplication.status = "submitted";
            await sendVisaApplicationEmail(reseller.email, visaApplication);
            // await sendAdminVisaApplicationEmai(visaApplication);

            await visaApplication.save();

            res.status(200).json(visaApplication);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleVisaOrderDetails: async (req, res) => {
        try {
            const { orderId } = req.params;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            const visaApplication = await B2BVisaApplication.findOne({
                _id: orderId,
            }).populate({
                path: "visaType",
                populate: { path: "visa", populate: { path: "country" } },
            });

            if (!visaApplication) {
                return sendErrorResponse(res, 400, "Visa Application Not Found");
            }

            res.status(200).json(visaApplication);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
