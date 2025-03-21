const { isValidObjectId } = require("mongoose");
const { B2BTransaction, B2BWallet, Reseller, B2BVisaApplication } = require("../../../b2b/models");

const { sendErrorResponse } = require("../../../helpers");
const { VisaApplication, B2CVisaApplication } = require("../../../models");
const sendVisaApplicationApproveEmail = require("../../helpers/sendVisaApplicationApproveEmail");
const sendVisaApplicationRejectionEmail = require("../../helpers/sendVisaApplicationCancelEmail");

module.exports = {
    listAllVisaApplication: async (req, res) => {
        try {
            const { skip = 0, limit = 10, status, referenceNumber, orderedBy } = req.query;

            let query = {};
            let filter2;

            if (referenceNumber && referenceNumber !== "") {
                query.referenceNumber = { $regex: referenceNumber, $options: "i" };
            }

            if (status && status !== "all") {
                filter2 = status;
            }

            if (orderedBy == "b2b") {
                query.orderedBy = "reseller";
            } else if (orderedBy == "subAgent") {
                query.orderedBy = "sub-agent";
            }

            if (orderedBy == "b2c") {
                const visaApplications = await B2CVisaApplication.aggregate([
                    {
                        $match: query,
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "user",
                            foreignField: "_id",
                            as: "user",
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
                            user: { $arrayElemAt: ["$user", 0] },
                            visaType: { $arrayElemAt: ["$visaType.visaName", 0] },
                            visa: { $arrayElemAt: ["$visa.name", 0] },
                        },
                    },
                    {
                        $unwind: "$travellers",
                    },
                    {
                        $match: {
                            $expr: {
                                $eq: [
                                    "$travellers.isStatus",
                                    {
                                        $ifNull: [filter2, "$travellers.isStatus"],
                                    },
                                ],
                            },
                        },
                    },
                    {
                        $sort: {
                            createdAt: -1,
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            count: { $sum: 1 },
                            visaApplications: { $push: "$$ROOT" },
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            count: 1,
                            visaApplications: {
                                $slice: ["$visaApplications", Number(skip * limit), Number(limit)],
                            },
                        },
                    },
                ]);

                if (!visaApplications || visaApplications.length < 1) {
                    return sendErrorResponse(res, 400, "VisaApplication Not Found ");
                }

                res.status(200).json({
                    visaApplications: visaApplications[0]?.visaApplications,
                    skip: Number(skip),
                    limit: Number(limit),
                    totalVisaApplications: visaApplications[0]?.count,
                });
            } else {
                const visaApplications = await B2BVisaApplication.aggregate([
                    {
                        $match: query,
                    },
                    {
                        $lookup: {
                            from: "resellers",
                            localField: "reseller",
                            foreignField: "_id",
                            as: "reseller",
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
                            reseller: { $arrayElemAt: ["$reseller", 0] },
                            visaType: { $arrayElemAt: ["$visaType.visaName", 0] },
                            visa: { $arrayElemAt: ["$visa.name", 0] },
                        },
                    },
                    {
                        $unwind: "$travellers",
                    },
                    {
                        $match: {
                            $expr: {
                                $eq: [
                                    "$travellers.isStatus",
                                    {
                                        $ifNull: [filter2, "$travellers.isStatus"],
                                    },
                                ],
                            },
                        },
                    },
                    {
                        $sort: {
                            createdAt: -1,
                        },
                    },
                    {
                        $group: {
                            _id: null,
                            count: { $sum: 1 },
                            visaApplications: { $push: "$$ROOT" },
                        },
                    },
                    {
                        $project: {
                            _id: 0,
                            count: 1,
                            visaApplications: {
                                $slice: ["$visaApplications", Number(skip * limit), Number(limit)],
                            },
                        },
                    },
                ]);

                if (!visaApplications) {
                    return sendErrorResponse(res, 400, "VisaApplication Not Found ");
                }

                res.status(200).json({
                    visaApplications: visaApplications[0]?.visaApplications || [],
                    skip: Number(skip),
                    limit: Number(limit),
                    totalVisaApplications: visaApplications[0]?.count || 0,
                });
            }
        } catch (err) {
            console.log(err, "error");
            sendErrorResponse(res, 500, err);
        }
    },

    listSingleVisaApplication: async (req, res) => {
        try {
            const { id, orderedBy, travellerId } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid VisaApplication id");
            }

            let query = { _id: id };

            if (orderedBy == "b2b") {
                query.orderedBy = "reseller";
            } else if (orderedBy == "subAgent") {
                query.orderedBy = "sub-agent";
            }

            if (orderedBy == "b2c") {
                // const visaApplication = await B2CVisaApplication.findOne(query).populate(
                //   "user travellers.documents travellers.country"
                // ).populate({
                //   path: 'visaType',
                //   populate: {
                //     path: 'visa',
                //     populate : {
                //       path : 'country',
                //       select : "countryName"
                //     }

                //   }
                // })
                const visaApplication = await B2CVisaApplication.findOne(query, {
                    travellers: { $elemMatch: { _id: travellerId } },
                })
                    .populate({
                        path: "visaType",
                        populate: {
                            path: "visa",
                            populate: {
                                path: "country",
                                select: "countryName",
                            },
                        },
                    })
                    .populate(
                        "user nationality travellers.documents travellers.country status totalPrice totalCost"
                    );

                if (!visaApplication) {
                    return sendErrorResponse(res, 400, "VisaApplication Not Found ");
                }

                res.status(200).json(visaApplication);
            } else {
                // const visaApplication = await VisaApplication.findOne(query).populate(
                //   "reseller travellers.documents travellers.country"
                // )

                const visaApplication = await VisaApplication.findOne(query, {
                    travellers: { $elemMatch: { _id: travellerId } },
                })
                    .populate({
                        path: "visaType",
                        populate: {
                            path: "visa",
                            populate: {
                                path: "country",
                                select: "countryName",
                            },
                        },
                    })
                    .populate(
                        "reseller referenceNumber createdAt  travellers.documents travellers.country status totalPrice totalCost"
                    );

                if (!visaApplication) {
                    return sendErrorResponse(res, 400, "VisaApplication Not Found ");
                }

                res.status(200).json(visaApplication);
            }
        } catch (err) {
            console.log(err, "error");
            sendErrorResponse(res, 500, err);
        }
    },

    approveVisaApplicationStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const { travellerId } = req.params;
            const { orderedBy } = req.body;

            let query = { _id: id };

            if (orderedBy == "b2b") {
                query.orderedBy = "reseller";
            } else if (orderedBy == "subAgent") {
                query.orderedBy = "sub-agent";
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid VisaApplication id");
            }

            let visa;
            if (req.file?.path) {
                visa = "/" + req.file.path.replace(/\\/g, "/");
            }

            if (!visa) {
                return sendErrorResponse(res, 400, "Pdf Not Uploaded");
            }

            if (orderedBy == "b2c") {
                const visaApplication = await B2CVisaApplication.findOne(query)
                    .populate("user travellers.documents travellers.country")
                    .populate({
                        path: "visaType",
                        populate: {
                            path: "visa",
                            populate: {
                                path: "country",
                                select: "countryName",
                            },
                        },
                    });

                if (!visaApplication) {
                    return sendErrorResponse(
                        res,
                        400,
                        "VisaApplication Not Found Or Not Submitted"
                    );
                }

                if (!visaApplication.status == "payed") {
                    return sendErrorResponse(res, 400, "VisaApplication Amount Not Payed ");
                }

                let upload = await B2CVisaApplication.updateOne(
                    { _id: id, "travellers._id": travellerId },
                    {
                        $set: {
                            "travellers.$.visaUpload": visa,
                            "travellers.$.isStatus": "approved",
                        },
                    }
                );

                const filteredTraveller = visaApplication.travellers.filter((traveller) => {
                    return traveller._id == travellerId;
                });

                sendVisaApplicationApproveEmail(visaApplication, filteredTraveller, visa);

                await visaApplication.save();

                res.status(200).json({ status: true, message: "Visa Uploaded Succesfully " });
            } else {
                const visaApplication = await VisaApplication.findOne(query)
                    .populate("reseller travellers.documents travellers.country")
                    .populate({
                        path: "visaType",
                        populate: {
                            path: "visa",
                            populate: {
                                path: "country",
                                select: "countryName",
                            },
                        },
                    });

                if (!visaApplication) {
                    return sendErrorResponse(
                        res,
                        400,
                        "VisaApplication Not Found Or Not Submitted"
                    );
                }

                if (!visaApplication.status == "payed") {
                    return sendErrorResponse(res, 400, "VisaApplication Amount Payed ");
                }

                let upload = await VisaApplication.updateOne(
                    { _id: id, "travellers._id": travellerId },
                    {
                        $set: {
                            "travellers.$.visaUpload": visa,
                            "travellers.$.isStatus": "approved",
                        },
                    }
                );

                let reseller = await Reseller.findById(visaApplication.reseller).populate(
                    "referredBy"
                );

                if (reseller.role == "subAgent" && visaApplication.subAgentMarkup > 0) {
                    const transaction = new B2BTransaction({
                        reseller: reseller?.referredBy,
                        transactionType: "markup",
                        status: "success",
                        paymentProcessor: "wallet",
                        amount: visaApplication.subAgentMarkup / visaApplication.noOfTravellers,
                        order: visaApplication._id,
                        orderItem: visaApplication.visaType,
                    });

                    let wallet = await B2BWallet.updateOne(
                        {
                            reseller: reseller?.referredBy,
                        },
                        {
                            $inc: {
                                balance: visaApplication.subAgentMarkup,
                            },
                        },
                        {
                            upsert: true,
                        }
                    );

                    transaction.status = "success";

                    await transaction.save();
                }

                if (visaApplication.resellerMarkup > 0) {
                    const transaction = new B2BTransaction({
                        reseller: reseller?._id,
                        transactionType: "markup",
                        status: "success",
                        paymentProcessor: "wallet",
                        amount: visaApplication.resellerMarkup / visaApplication.noOfTravellers,
                        order: visaApplication._id,
                        orderItem: visaApplication.visaType,
                    });

                    let wallet = await B2BWallet.updateOne(
                        {
                            reseller: reseller?._id,
                        },
                        {
                            $inc: {
                                balance: visaApplication.resellerMarkup,
                            },
                        },
                        {
                            upsert: true,
                        }
                    );

                    transaction.status = "success";
                    await transaction.save();
                }

                const filteredTraveller = visaApplication.travellers.filter((traveller) => {
                    return traveller._id == travellerId;
                });

                await sendVisaApplicationApproveEmail(visaApplication, filteredTraveller, visa);

                await visaApplication.save();

                res.status(200).json({ status: true, message: "Visa Uploaded Succesfully " });
            }
        } catch (err) {
            console.log(err, "error");
            sendErrorResponse(res, 500, err);
        }
    },

    cancelVisaApplicationStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const { travellerId } = req.params;
            const { reason, orderedBy } = req.body;

            let query = { _id: id };

            if (orderedBy == "b2b") {
                query.orderedBy = "reseller";
            } else if (orderedBy == "subAgent") {
                query.orderedBy = "sub-agent";
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid VisaApplication id");
            }

            if (orderedBy == "b2c") {
                const visaApplication = await B2CVisaApplication.findOne(query)
                    .populate("user travellers.documents travellers.country")
                    .populate({
                        path: "visaType",
                        populate: {
                            path: "visa",
                            populate: {
                                path: "country",
                                select: "countryName",
                            },
                        },
                    });

                if (!visaApplication) {
                    return sendErrorResponse(
                        res,
                        400,
                        "VisaApplication Not Found Or Not Submitted"
                    );
                }

                if (!visaApplication.status == "payed") {
                    return sendErrorResponse(res, 400, "VisaApplication Amount Not Payed ");
                }

                let upload = await B2CVisaApplication.updateOne(
                    { _id: id, "travellers._id": travellerId },
                    {
                        $set: {
                            "travellers.$.reason": reason,
                            "travellers.$.isStatus": "rejected",
                        },
                    }
                );

                const filteredTraveller = visaApplication.travellers.filter((traveller) => {
                    return traveller._id == travellerId;
                });

                sendVisaApplicationRejectionEmail(visaApplication, filteredTraveller, reason);

                await visaApplication.save();

                res.status(200).json({ status: true, message: "Visa rejected Succesfully " });
            } else {
                const visaApplication = await VisaApplication.findOne(query)
                    .populate("reseller travellers.documents travellers.country")
                    .populate({
                        path: "visaType",
                        populate: {
                            path: "visa",
                            populate: {
                                path: "country",
                                select: "countryName",
                            },
                        },
                    });

                if (!visaApplication) {
                    return sendErrorResponse(
                        res,
                        400,
                        "VisaApplication Not Found Or Not Submitted"
                    );
                }

                if (!visaApplication.status == "payed") {
                    return sendErrorResponse(res, 400, "VisaApplication Amount Payed ");
                }

                let upload = await VisaApplication.updateOne(
                    { _id: id, "travellers._id": travellerId },
                    {
                        $set: {
                            "travellers.$.reason": reason,
                            "travellers.$.isStatus": "rejected",
                        },
                    }
                );

                let reseller = await Reseller.findById(visaApplication.reseller).populate(
                    "referredBy"
                );

                if (reseller.role == "subAgent" && visaApplication.subAgentMarkup > 0) {
                    const transaction = new B2BTransaction({
                        reseller: reseller?.referredBy,
                        transactionType: "markup",
                        status: "success",
                        paymentProcessor: "wallet",
                        amount: visaApplication.subAgentMarkup / visaApplication.noOfTravellers,
                        order: visaApplication._id,
                        orderItem: visaApplication.visaType,
                    });

                    let wallet = await B2BWallet.updateOne(
                        {
                            reseller: reseller?.referredBy,
                        },
                        {
                            $inc: {
                                balance: visaApplication.subAgentMarkup,
                            },
                        },
                        {
                            upsert: true,
                        }
                    );

                    transaction.status = "success";

                    await transaction.save();
                }

                if (visaApplication.resellerMarkup > 0) {
                    const transaction = new B2BTransaction({
                        reseller: reseller?._id,
                        transactionType: "markup",
                        status: "success",
                        paymentProcessor: "wallet",
                        amount: visaApplication.resellerMarkup / visaApplication.noOfTravellers,
                        order: visaApplication._id,
                        orderItem: visaApplication.visaType,
                    });

                    let wallet = await B2BWallet.updateOne(
                        {
                            reseller: reseller?._id,
                        },
                        {
                            $inc: {
                                balance: visaApplication.resellerMarkup,
                            },
                        },
                        {
                            upsert: true,
                        }
                    );

                    transaction.status = "success";
                    await transaction.save();
                }

                const filteredTraveller = visaApplication.travellers.filter((traveller) => {
                    return traveller._id == travellerId;
                });

                sendVisaApplicationRejectionEmail(visaApplication, filteredTraveller, reason);

                await visaApplication.save();

                res.status(200).json({ status: true, message: "Visa rejected Succesfully " });
            }
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
