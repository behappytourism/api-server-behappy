const { isValidObjectId, Types } = require("mongoose");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const nodeCCAvenue = require("node-ccavenue");
const { generateUniqueString } = require("../../utils");
const {
    sendMobileOtp,
    sendEmail,
    sendErrorResponse,
    sendVisaApplicationEmail,
    userOrderSignUpEmail,
} = require("../../helpers");
const {
    B2BWallet,
    B2BTransaction,
    VisaType,
    Country,
    B2CVisaApplication,
    B2CTransaction,
    User,
    VisaDocument,
    VisaNationality,
} = require("../../models");
const {
    b2cVisaApplicationSchema,
    visaOrderCaptureSchema,
} = require("../../validations/b2cVisaApplication.schema");
const { createOrder, fetchOrder, fetchPayment } = require("../../utils/paypal");
const { convertCurrency } = require("../../b2b/helpers/currencyHelpers");
const { completeOrderAfterPayment } = require("../../helpers/attractionOrderHelpers");
const sendAdminVisaApplicationEmail = require("../../b2b/helpers/sendVisaAdminEmail");
const createVisaOrderInvoice = require("../../helpers/visa/createvisaOrderInvoice");

const instance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const ccav = new nodeCCAvenue.Configure({
    merchant_id: process.env.CCAVENUE_MERCHANT_ID,
    working_key: process.env.CCAVENUE_WORKING_KEY,
});
module.exports = {
    applyVisa: async (req, res) => {
        try {
            const { visaType, email, noOfAdult, noOfChild, travellers, nationality } = req.body;

            const { _, error } = b2cVisaApplicationSchema.validate(req.body);
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
                slug: nationality,
                isDeleted: false,
            });

            if (!visaNationality) {
                return sendErrorResponse(res, 404, "Visa Nationality not found");
            }

            const selectedVisaType = visaNationality.visas.find(
                (visa) =>
                    visa.visaType.toString() === visaType.toString() &&
                    visa?.createdFor === "b2c" &&
                    visa?.isDeleted === false
            );

            if (!selectedVisaType) {
                return sendErrorResponse(res, 404, "visa type not found");
            }

            let user;
            if (!req.user) {
                if (!isValidObjectId(visaNationality.nationality)) {
                    return sendErrorResponse(res, 400, "Invalid country id");
                }

                const countryDetails = await Country.findOne({
                    _id: visaNationality.nationality,
                    isDeleted: false,
                });

                if (!countryDetails) {
                    return sendErrorResponse(res, 400, "Country not found");
                }

                user = await User.findOne({ email: travellers[0]?.email });
                if (!user) {
                    const password = crypto.randomBytes(6);
                    user = new User({
                        name: travellers[0]?.firstName,
                        email: travellers[0]?.email,
                        phoneNumber: travellers[0]?.contactNo,
                        country: visaNationality.nationality,
                        password,
                    });

                    userOrderSignUpEmail(
                        email,
                        "New Account",
                        `username : ${email} password : ${password}`
                    );

                    await user.save();
                }
            }

            let buyer = req.user || user;

            let totalAdultPrice = selectedVisaType.adultPrice * noOfAdult;
            let totalChildPrice = selectedVisaType.childPrice * noOfChild;
            let totalPrice = totalAdultPrice + totalChildPrice;

            let totalAdultCost = selectedVisaType.adultCost * noOfAdult;
            let totalChildCost = selectedVisaType.childCost * noOfChild;
            let totalCost = totalAdultCost + totalChildCost;

            let profit = totalPrice - totalCost;

            console.log(visaNationality._id, "visaNationality._id");

            const newVisaApplication = new B2CVisaApplication({
                visaType,
                nationality: visaNationality._id,
                totalAdultPrice,
                totalChildPrice,
                totalPrice,
                totalAdultCost,
                totalChildCost,
                totalCost,
                profit,
                email: travellers[0]?.email,
                contactNo: travellers[0]?.contactNo,
                noOfAdult,
                noOfChild,
                travellers,
                user: buyer?._id,
                referenceNumber: generateUniqueString("B2CVSA"),
            });

            await newVisaApplication.save();

            res.status(200).json(newVisaApplication);
        } catch (err) {
            console.log(err, "error");
            sendErrorResponse(res, 500, err);
        }
    },

    initiatePayment: async (req, res) => {
        try {
            const { orderId } = req.params;
            const { paymentProcessor } = req.body;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "Invalid orderId ");
            }

            let visaApplication = await B2CVisaApplication.findById(orderId);

            if (!visaApplication) {
                return sendErrorResponse(res, 400, "Visa Application Not Found");
            }

            if (visaApplication.status == "payed") {
                return sendErrorResponse(res, 400, "Visa Application Already Payed");
            }

            let totalAmount = visaApplication.totalPrice;

            const newTransaction = new B2CTransaction({
                user: visaApplication.user,
                amount: visaApplication?.totalPrice,
                status: "pending",
                transactionType: "deduct",
                paymentProcessor,
                orderId: visaApplication?._id,
            });
            await newTransaction.save();

            if (paymentProcessor === "paypal") {
                const currency = "USD";
                const totalAmountUSD = await convertCurrency(totalAmount, currency);
                console.log(totalAmountUSD);
                const response = await createOrder(totalAmountUSD, currency);

                if (response.statusCode !== 201) {
                    return sendErrorResponse(
                        res,
                        400,
                        "Something went wrong while fetching order! Please try again later"
                    );
                }

                return res.status(200).json(response.result);
            } else if (paymentProcessor === "razorpay") {
                const currency = "INR";
                const totalAmountINR = await convertCurrency(totalAmount, currency);
                const options = {
                    amount: totalAmountINR * 100,
                    currency,
                };
                const order = await instance.orders.create(options);
                return res.status(200).json(order);
            } else if (paymentProcessor === "ccavenue") {
                const orderParams = {
                    merchant_id: process.env.CCAVENUE_MERCHANT_ID,
                    order_id: visaApplication?._id,
                    currency: "AED",
                    amount: visaApplication.totalPrice,
                    redirect_url: `${process.env.SERVER_URL}/api/v1/visa/application/ccavenue/capture`,
                    cancel_url: `${process.env.SERVER_URL}/api/v1/visa/application/ccavenue/capture`,
                    language: "EN",
                };
                let accessCode = process.env.CCAVENUE_ACCESS_CODE;

                const encRequest = ccav.getEncryptedOrder(orderParams);
                const formbody =
                    '<form id="nonseamless" method="post" name="redirect" action="https://secure.ccavenue.ae/transaction/transaction.do?command=initiateTransaction"/> <input type="hidden" id="encRequest" name="encRequest" value="' +
                    encRequest +
                    '"><input type="hidden" name="access_code" id="access_code" value="' +
                    accessCode +
                    '"><script language="javascript">document.redirect.submit();</script></form>';

                res.setHeader("Content-Type", "text/html");
                res.write(formbody);
                res.end();
                return;
            } else {
                return sendErrorResponse(res, 400, "Invalid payment processor");
            }
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    capturePayalVisaApplication: async (req, res) => {
        try {
            const { paymentId, paymentOrderId, orderId } = req.body;

            // const { _, error } = visaOrderCaptureSchema.validate(
            //     req.body
            // );

            // if (error) {
            //     return sendErrorResponse(res, 400, error.details[0].message);
            // }

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "Invalid order id");
            }

            let visaApplication = await B2CVisaApplication.findById(orderId);

            if (!visaApplication) {
                return sendErrorResponse(res, 400, "visa application not found!");
            }

            const transaction = await B2CTransaction.findOne({
                paymentOrderId: orderId,
            });

            if (!transaction) {
                const transaction = new B2CTransaction({
                    user: visaApplication.user,
                    amount: visaApplication?.totalPrice,
                    status: "pending",
                    transactionType: "deduct",
                    paymentProcessor: "paypal",
                    orderId: visaApplication?._id,
                });
                await transaction.save();
            }

            const orderObject = await fetchOrder(paymentOrderId);

            if (orderObject.statusCode == "500") {
                transaction.status = "failed";
                await transaction.save();

                return sendErrorResponse(
                    res,
                    400,
                    "Error while fetching order status from paypal. Check with XYZ team if amount is debited from your bank!"
                );
            } else if (orderObject.status !== "COMPLETED") {
                transaction.status = "failed";
                await transaction.save();

                return sendErrorResponse(
                    res,
                    400,
                    "Paypal order status is not Completed. Check with XYZ team if amount is debited from your bank!"
                );
            } else {
                const paymentObject = await fetchPayment(paymentId);

                if (paymentObject.statusCode == "500") {
                    transaction.status = "failed";
                    await transaction.save();

                    return sendErrorResponse(
                        res,
                        400,
                        "Error while fetching payment status from paypal. Check with XYZ team if amount is debited from your bank!"
                    );
                } else if (paymentObject.result.status !== "COMPLETED") {
                    transaction.status = "failed";
                    await transaction.save();

                    return sendErrorResponse(
                        res,
                        400,
                        "Paypal payment status is not Completed. Please complete your payment!"
                    );
                }
            }

            transaction.status = "success";
            await transaction.save();

            visaApplication.status = "payed";
            await visaApplication.save();

            res.status(200).json({
                visaApplication,
                status: "Transation Success",
            });

            // }

            // }
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    captureCCAvenueAttractionPayment: async (req, res) => {
        try {
            const { encResp } = req.body;
            const { visa, visaType, nationality } = req.query;

            const decryptedJsonResponse = ccav.redirectResponseToJson(encResp);
            const { order_id, order_status } = decryptedJsonResponse;

            const visaOrder = await B2CVisaApplication.findOne({
                _id: order_id,
            });
            if (!visaOrder) {
                return sendErrorResponse(
                    res,
                    400,
                    "visaOrder order not found!. Please create an order first. Check with our team if amount is debited from your bank!"
                );
            }

            if (visaOrder.status === "payed") {
                return sendErrorResponse(
                    res,
                    400,
                    "This order already completed, Thank you. Check with our team if you paid multiple times."
                );
            }

            let transaction = await B2CTransaction.findOne({
                paymentProcessor: "ccavenue",
                orderId: visaOrder?._id,
                status: "pending",
            });
            if (!transaction) {
                const transaction = new B2CTransaction({
                    user: visaOrder.user,
                    amount: visaOrder?.totalPrice,
                    status: "pending",
                    transactionType: "deduct",
                    paymentProcessor: "ccavenue",
                    orderId: visaOrder?._id,
                });
                await transaction.save();
            }

            if (order_status !== "Success") {
                transaction.status = "failed";
                await transaction.save();

                res.writeHead(301, {
                    Location: `${process.env.REACT_APP_URL}/visa/orders/${order_id}/cancelled`,
                });
                res.end();
            } else {
                transaction.status = "success";
                await transaction.save();
                visaOrder.status = "payed";
                await visaOrder.save();

                await completeOrderAfterPayment(visaOrder);

                visaOrder.orderStatus = "completed";
                await visaOrder.save();

                res.writeHead(301, {
                    // Location: `${process.env.REACT_APP_URL}/visa/${visa}/apply?nationality=${nationality}&visaType=${visaType}&orderId=${visaOrder?._id}&status=${visaOrder.status}`,
                    Location: `${process.env.REACT_APP_URL}/visa/document-submission/${order_id}`,
                });
                res.end();
            }
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    captureRazorpayAttractionPayment: async (req, res) => {
        try {
            const { razorpay_order_id, transactionid, razorpay_signature, orderId } = req.body;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            const visaApplication = await B2CVisaApplication.findOne({
                _id: orderId,
            });
            if (!visaApplication) {
                return sendErrorResponse(
                    res,
                    400,
                    "visaApplication order not found!. Please create an order first. Check with our team if amount is debited from your bank!"
                );
            }

            let transaction = await B2CTransaction.findOne({
                paymentProcessor: "razorpay",
                orderId: visaApplication?._id,
                status: "pending",
            });
            if (!transaction) {
                const newTransaction = new B2CTransaction({
                    user: visaApplication.user,
                    amount: visaApplication?.totalAmount,
                    status: "pending",
                    transactionType: "deduct",
                    paymentProcessor: "razorpay",
                    orderId: visaApplication?._id,
                });
                await newTransaction.save();
            }

            const generated_signature = crypto.createHmac(
                "sha256",
                process.env.RAZORPAY_KEY_SECRET
            );
            generated_signature.update(razorpay_order_id + "|" + transactionid);

            if (generated_signature.digest("hex") !== razorpay_signature) {
                transaction.status = "failed";
                await transaction.save();
                // visaApplication.orderStatus = "failed";
                // await attractionOrder.save();

                return sendErrorResponse(res, 400, "Transaction failed");
            }

            transaction.status = "success";
            await transaction.save();

            visaApplication.status = "payed";
            await visaApplication.save();

            return res.status(200).json({ visaApplication, message: "Transaction Successful" });
        } catch (err) {
            sendErrorResponse(res, 400, err);
        }
    },

    // completeVisaDocumentOrder: async (req, res) => {
    //     try {
    //         const { orderId } = req.params;

    //         if (!isValidObjectId(orderId)) {
    //             return sendErrorResponse(res, 400, "invalid order id");
    //         }

    //         const visaApplication = await B2CVisaApplication.findOne({
    //             _id: orderId,
    //         }).populate({
    //             path: "visaType",
    //             populate: {
    //                 path: "visa",
    //                 populate: { path: "country" },
    //             },
    //         });

    //         if (!visaApplication) {
    //             return sendErrorResponse(res, 400, "visa application  not found");
    //         }

    //         if (visaApplication?.status !== "payed") {
    //             return sendErrorResponse(res, 400, "amount not paid");
    //         }

    //         if (
    //             req.files?.["passportFistPagePhoto"]?.length !==
    //                 Number(visaApplication?.noOfChild + visaApplication?.noOfAdult) ||
    //             req.files?.["passportLastPagePhoto"]?.length !==
    //                 Number(visaApplication?.noOfChild + visaApplication?.noOfAdult) ||
    //             req.files?.["passportSizePhoto"]?.length !==
    //                 Number(visaApplication?.noOfChild + visaApplication?.noOfAdult) ||
    //             req.files?.["supportiveDoc1"]?.length !==
    //                 Number(visaApplication?.noOfChild + visaApplication?.noOfAdult) ||
    //             req.files?.["supportiveDoc2"]?.length !==
    //                 Number(visaApplication?.noOfChild + visaApplication?.noOfAdult)
    //         ) {
    //             return sendErrorResponse(
    //                 res,
    //                 400,
    //                 "Please upload the correct number of all required documents."
    //             );
    //         }

    //         const passportFirstPagePhotos = req.files["passportFistPagePhoto"];
    //         const passportLastPagePhotos = req.files["passportLastPagePhoto"];
    //         const passportSizePhotos = req.files["passportSizePhoto"];
    //         const supportiveDoc1s = req.files["supportiveDoc1"];
    //         const supportiveDoc2s = req.files["supportiveDoc2"];

    //         const photos = [];
    //         let promises = [];

    //         for (let i = 0; i < passportFirstPagePhotos?.length; i++) {
    //             const visaDocument = new VisaDocument({
    //                 passportFistPagePhoto:
    //                     "/" + passportFirstPagePhotos[i]?.path?.replace(/\\/g, "/"),
    //                 passportLastPagePhoto:
    //                     "/" + passportLastPagePhotos[i]?.path?.replace(/\\/g, "/"),
    //                 passportSizePhoto: "/" + passportSizePhotos[i]?.path?.replace(/\\/g, "/"),
    //                 supportiveDoc1: "/" + supportiveDoc1s[i]?.path?.replace(/\\/g, "/"),
    //                 supportiveDoc2: "/" + supportiveDoc2s[i]?.path?.replace(/\\/g, "/"),
    //             });

    //             promises.push(
    //                 new Promise((resolve, reject) => {
    //                     visaDocument.save((error, document) => {
    //                         if (error) {
    //                             return reject(error);
    //                         }

    //                         visaApplication.travellers[i].documents = document._id;
    //                         visaApplication.travellers[i].isStatus = "submitted";

    //                         resolve();
    //                     });
    //                 })
    //             );
    //         }
    //         await Promise.all(promises);

    //         await visaApplication.save();
    //         // await sendVisaApplicationEmail(visaApplication);
    //         // await sendAdminVisaApplicationEmail(visaApplication);

    //         res.status(200).json({
    //             message: "documents uploaded successfully",
    //         });
    //     } catch (err) {
    //         sendErrorResponse(res, 500, err);
    //     }
    // },

    completeVisaDocumentOrder: async (req, res) => {
        try {
            const { orderId, travellerId } = req.params;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            const visaApplication = await B2CVisaApplication.findOne({
                _id: orderId,
            }).populate({
                path: "visaType",
                populate: {
                    path: "visa",
                    populate: { path: "country" },
                },
            });

            if (!visaApplication) {
                return sendErrorResponse(res, 400, "visa application  not found");
            }

            if (visaApplication?.status !== "payed") {
                return sendErrorResponse(res, 400, "visa application payment not done");
            }

            if (
                req.files?.["passportFistPagePhoto"]?.length !== 1 ||
                req.files?.["passportLastPagePhoto"]?.length !== 1
            ) {
                return sendErrorResponse(res, 400, "Please upload passport first and last page .");
            }

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

            await visaApplication.save();
            // await sendVisaApplicationEmail(visaApplication);
            // await sendAdminVisaApplicationEmail(visaApplication);

            res.status(200).json({
                travellerId,
                isStatus: "submitted",
                message: "documents uploaded successfully",
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
            // const {
            //   title,
            //   firstName,
            //   lastName,
            //   dateOfBirth,
            //   expiryDate,
            //   country,
            //   passportNo,
            //   contactNo,
            //   email,
            // } = req.body;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            if (!isValidObjectId(travellerId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            const visaApplication = await B2CVisaApplication.findOne({
                _id: orderId,
                user: req.user._id,
            }).populate({
                path: "visaType",
                populate: { path: "visa", populate: { path: "country" } },
            });

            if (!visaApplication) {
                return sendErrorResponse(res, 404, "Visa Application Not Found");
            }
            if (visaApplication.status !== "payed") {
                return sendErrorResponse(res, 404, "Visa Application Amount Not Payed");
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

                        console.log(document, "document");

                        let upload = await B2CVisaApplication.updateOne(
                            {
                                _id: orderId,
                                "travellers._id": travellerId,
                            },
                            {
                                $set: {
                                    "travellers.$.documents": document._id,
                                    "travellers.$.isStatus": "submitted",
                                },
                            }
                            // {
                            //   $set: {
                            //     "travellers.$.documents": document._id,
                            //     "travellers.$.title": title,
                            //     "travellers.$.firstName": firstName,
                            //     "travellers.$.lastName": lastName,
                            //     "travellers.$.dateOfBirth": parsedDateOfBirth,
                            //     "travellers.$.expiryDate": parsedExpiryDate,
                            //     "travellers.$.country": country,
                            //     "travellers.$.passportNo": passportNo,
                            //     "travellers.$.contactNo": contactNo,
                            //     "travellers.$.email": email,
                            //     "travellers.$.isStatus": "submitted",
                            //   },
                            // }
                        );

                        console.log(upload, "upload");

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

    completeAllDocumentUpload: async (req, res) => {
        try {
            const { orderId } = req.params;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            const visaApplication = await B2CVisaApplication.findOne({
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

    visaApplicationInvoice: async (req, res) => {
        try {
            const { orderId } = req.params;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            const visaApplication = await B2CVisaApplication.findOne({
                _id: orderId,
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

    downloadVisaInvoice: async (req, res) => {
        try {
            const { orderId } = req.params;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid visa order id");
            }

            const visaOrder = await B2CVisaApplication.findOne({
                _id: orderId,
            })
                .select("_id status")
                .lean();

            if (!visaOrder) {
                return sendErrorResponse(res, 404, "visa order not found");
            }

            if (visaOrder.status !== "payed") {
                return sendErrorResponse(res, 400, "sorry, visa order not completed");
            }

            const pdfBuffer = await createVisaOrderInvoice({
                orderId,
            });

            res.set({
                "Content-Type": "application/pdf",
                "Content-Disposition": "attachment; filename=invoice.pdf",
            });
            res.send(pdfBuffer);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    visaApplicationList: async (req, res) => {
        try {
            const visaApplication = await B2CVisaApplication.aggregate([
                {
                    $match: {
                        user: req.user._id,
                    },
                },
                {
                    $lookup: {
                        from: "visatypes",
                        localField: "visaType",
                        foreignField: "_id",
                        as: "visaType",
                    },
                },
                {
                    $lookup: {
                        from: "visas",
                        localField: "visaType.visa",
                        foreignField: "_id",
                        as: "visa",
                    },
                },
                {
                    $set: {
                        visaType: { $arrayElemAt: ["$visaType.name", 0] },
                        visa: { $arrayElemAt: ["$visa.name", 0] },
                    },
                },
                {
                    $unwind: "$travellers",
                },
                { $sort: { createdAt: -1 } },

                // },{
                //   $project : {
                //     visaType : 1 , visa : 1
                //   }
                // }
            ]);

            if (!visaApplication) {
                return sendErrorResponse(res, 404, "visa application  not found");
            }

            res.status(200).json(visaApplication);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    singleVisaApplication: async (req, res) => {
        try {
            const { orderId, travellerId } = req.params;

            const visaApplication = await B2CVisaApplication.findOne(
                {
                    _id: orderId,
                    // user: req.user._id,
                },
                { travellers: { $elemMatch: { _id: travellerId } } }
            )
                .populate("visaType")
                .populate("travellers.documents travellers.country");

            if (!visaApplication) {
                return sendErrorResponse(res, 404, "visa application  not found");
            }

            res.status(200).json(visaApplication);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    visaCompleteOrderDetails: async (req, res) => {
        try {
            const { orderId } = req.params;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            const visaApplication = await B2CVisaApplication.findOne({
                _id: orderId,
            }).select("travellers");

            if (!visaApplication) {
                return sendErrorResponse(res, 404, "visa application  not found");
            }

            res.status(200).json(visaApplication);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
