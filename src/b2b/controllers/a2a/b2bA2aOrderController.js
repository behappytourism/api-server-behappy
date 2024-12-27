const { isValidObjectId, Types } = require("mongoose");
const { sendErrorResponse, sendMobileOtp } = require("../../../helpers");
const { Country } = require("../../../models");
const { generateUniqueString } = require("../../../utils");

const {
    B2BA2aTicket,
    B2BA2a,
    B2BWallet,
    B2BTransaction,
    B2BSpecialAttractionMarkup,
    B2BA2aOrder,
    B2BA2aTicketMarkup,
    B2BSpecialA2aMarkup,
    B2BMarkupProfile,
    B2bA2aOrderLog,
} = require("../../models");
const sendInsufficentBalanceMail = require("../../helpers/sendInsufficentBalanceEmail");

const {
    b2bA2aOrderSchema,
    b2bA2aOrderUpdateSchema,
} = require("../../validations/b2bA2aOrder.schema");
const createA2aSingleTicketPdf = require("../../helpers/b2bA2aSingleTicket");
const createA2aMultipleTicketPdf = require("../../helpers/b2bA2aMultipleTicketHelper");
const B2BA2aQuota = require("../../models/a2a/b2bA2aQuota.model");
const { createDownloadSummary } = require("../../../admin/helpers");
const { a2aTicketSenderHelper } = require("../../helpers/a2a/b2bA2aWhatsappHelper");
const { deductAmountFromWallet, checkWalletBalance } = require("../../utils/wallet");

module.exports = {
    createA2aOrder: async (req, res) => {
        try {
            const { a2aTicket, noOfTravellers, passengerDetails, date, markup } = req.body;

            const { _, error } = b2bA2aOrderSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const a2aTicketDetails = await B2BA2aTicket.findOne({
                _id: a2aTicket,
                isDeleted: false,
            });

            if (!a2aTicketDetails) {
                return sendErrorResponse(res, 400, "A2A Ticket Not Found");
            }

            const b2bA2aQuota = await B2BA2aQuota.findOne({
                ticketId: a2aTicket,
                resellerId: req.reseller._id,
                isDeleted: false,
                isActive: true,
            });

            if (!b2bA2aQuota) {
                if (a2aTicketDetails.availableSeats < noOfTravellers) {
                    return sendErrorResponse(
                        res,
                        400,
                        `Only ${a2aTicketDetails.availableSeats} tickets is left `
                    );
                }
            } else {
                if (
                    Number(b2bA2aQuota.ticketCountTotal) - Number(b2bA2aQuota.ticketCountUsed) <
                    Number(noOfTravellers)
                ) {
                    return sendErrorResponse(
                        res,
                        400,
                        `Only ${b2bA2aQuota.ticketCountTotal} tickets is left `
                    );
                }
            }

            if (noOfTravellers !== passengerDetails.length) {
                return sendErrorResponse(res, 400, "PassengerDetails Not Added ");
            }

            let b2bA2aMarkup = await B2BA2aTicketMarkup.findOne({
                a2aTicketId: a2aTicketDetails?._id,
            });

            let totalAdultMarkup = 0;
            let totalInfantMarkup = 0;
            if (b2bA2aMarkup) {
                if (b2bA2aMarkup.markupType === "flat") {
                    totalAdultMarkup = b2bA2aMarkup.markup;
                    totalInfantMarkup = b2bA2aMarkup.markup;
                } else {
                    totalAdultMarkup = (b2bA2aMarkup.markup * a2aTicketDetails.price) / 100;
                    totalInfantMarkup = (b2bA2aMarkup.markup * a2aTicketDetails.infantPrice) / 100;
                }
            }

            const a2aProfileMarkup = await B2BMarkupProfile.findOne({
                resellerId: req.reseller._id,
            });

            if (a2aProfileMarkup) {
                const profileMarkup = a2aProfileMarkup?.atoA?.find(
                    (atoA) => a2aTicketDetails?.a2aReference?.toString() === atoA?.atoa?.toString()
                );

                if (profileMarkup) {
                    if (profileMarkup?.markupType === "flat") {
                        totalAdultMarkup += profileMarkup?.markup;
                        totalInfantMarkup += profileMarkup?.markup;
                    } else {
                        let totalAddedAdultPrice =
                            Number(a2aTicketDetails?.price) + Number(totalAdultMarkup);
                        let totalAddedInfantPrice =
                            Number(a2aTicketDetails?.infantPrice) + Number(totalInfantMarkup);
                        totalAdultMarkup +=
                            (Number(profileMarkup?.markup) * Number(totalAddedAdultPrice)) / 100;
                        totalInfantMarkup +=
                            (Number(profileMarkup?.markup) * Number(totalAddedInfantPrice)) / 100;
                    }
                }
            }

            // const a2aSpecailMarkup = await B2BSpecialA2aMarkup.findOne({
            //     resellerId: req.reseller._id,
            // });

            // if (a2aSpecailMarkup) {
            //     if (a2aSpecailMarkup.markupType === "flat") {
            //         totalAdultMarkup += a2aSpecailMarkup.markup;
            //         totalInfantMarkup += a2aSpecailMarkup.markup;
            //     } else {
            //         let totalAddedAdultPrice =
            //             Number(a2aTicketDetails.price) + Number(totalAdultMarkup);
            //         let totalAddedInfantPrice =
            //             Number(a2aTicketDetails.infantPrice) + Number(totalInfantMarkup);
            //         console.log(totalInfantMarkup);
            //         totalAdultMarkup +=
            //             (Number(a2aSpecailMarkup.markup) * Number(totalAddedAdultPrice)) / 100;
            //         totalInfantMarkup +=
            //             (Number(a2aSpecailMarkup.markup) * Number(totalAddedInfantPrice)) / 100;
            //     }
            // }

            let amount = 0;

            for (i = 0; i < passengerDetails?.length; i++) {
                passengerDetails[i].amount =
                    Number(a2aTicketDetails?.price) + Number(totalAdultMarkup);
                passengerDetails[i].profit = totalAdultMarkup;
                if (passengerDetails[i].isInfant) {
                    passengerDetails[i].amount +=
                        Number(a2aTicketDetails?.infantPrice) + Number(totalInfantMarkup);
                    passengerDetails[i].profit += totalInfantMarkup;
                }
                passengerDetails[i].status = "pending";

                amount += Number(passengerDetails[i]?.amount);
            }

            let totalAmount = Number(amount) + Number(markup);

            const otp = 12345;

            const newA2aOrder = new B2BA2aOrder({
                reseller: req.reseller._id,
                orderedBy: req.reseller.role,
                a2aTicket,
                noOfTravellers,
                date,
                passengerDetails,
                totalAmount,
                orderStatus: "pending",
                referenceNumber: generateUniqueString("B2BA2A"),
                markup,
                amount,
                totalAmount,
                otp,
            });

            await newA2aOrder.save();

            res.status(200).json({
                _id: newA2aOrder._id,
                message: "new order created. please complete payment !",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    completeA2aOrder: async (req, res) => {
        try {
            const { orderId } = req.params;
            const { otp } = req.body;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            const a2aOrder = await B2BA2aOrder.findOne({
                _id: orderId,
                reseller: req.reseller._id,
            });

            if (!a2aOrder) {
                return sendErrorResponse(res, 404, "A2a order not found");
            }

            if (a2aOrder.orderStatus === "paid") {
                return sendErrorResponse(res, 400, "sorry, you have already completed this order!");
            }

            if (!Number(a2aOrder.otp) || Number(a2aOrder.otp) !== Number(otp)) {
                return sendErrorResponse(res, 400, "incorrect otp!");
            }

            const a2aTicket = await B2BA2aTicket.findOne({
                _id: a2aOrder.a2aTicket,
                isDeleted: false,
            });

            if (!a2aTicket) {
                return sendErrorResponse(res, 404, "A2a Ticket not found");
            }

            const b2bA2aQuota = await B2BA2aQuota.findOne({
                ticketId: a2aTicket,
                resellerId: req.reseller._id,
                isDeleted: false,
                isActive: true,
            });

            if (!b2bA2aQuota) {
                if (a2aTicket.availableSeats < a2aOrder.noOfTravellers) {
                    return sendErrorResponse(
                        res,
                        400,
                        `Only ${a2aTicket.availableSeats} tickets is left `
                    );
                }
            } else {
                if (
                    Number(b2bA2aQuota.ticketCountTotal) - Number(b2bA2aQuota.ticketCountUsed) <
                    a2aOrder.noOfTravellers
                ) {
                    return sendErrorResponse(
                        res,
                        400,
                        `Only ${
                            Number(b2bA2aQuota.ticketCountTotal) -
                            Number(b2bA2aQuota.ticketCountUsed)
                        } tickets is left `
                    );
                }
            }

            let amount = a2aOrder.amount;

            let wallet = await B2BWallet.findOne({
                reseller: req.reseller?._id,
            });

            let reseller = req.reseller;

            const balanceAvailable = checkWalletBalance(wallet, amount);
            if (!balanceAvailable) {
                // let reseller = req.reseller;
                // sendInsufficentBalanceMail(reseller);
                return sendErrorResponse(
                    res,
                    400,
                    "insufficient balance. please reacharge and try again"
                );
            }

            if (!b2bA2aQuota) {
                const updateTicket = await B2BA2aTicket.findOneAndUpdate(
                    {
                        _id: a2aOrder.a2aTicket,
                        isDeleted: false,
                        $and: [
                            { availableSeats: { $ne: 0 } },
                            { availableSeats: { $gte: a2aOrder.noOfTravellers } },
                        ],
                    },
                    {
                        $inc: { availableSeats: -a2aOrder.noOfTravellers }, // Decrement the availableSeats field
                    },
                    { new: true }
                );

                if (!updateTicket) {
                    return sendErrorResponse(res, 400, "Tickets  sold out . please try again");
                }

                await B2bA2aOrderLog.create({
                    reseller: req.reseller?._id,
                    orderId: orderId,
                    a2aTicketId: a2aTicket._id,
                    noOfTravellers: a2aOrder.noOfTravellers,
                    ticketNoBefore: a2aTicket.availableSeats,
                    ticketNoAfter: updateTicket.availableSeats,
                    dateTime: new Date(),
                });
            } else {
                b2bA2aQuota.ticketCountUsed += a2aOrder.noOfTravellers;
                await b2bA2aQuota.save();
            }

            try {
                deductAmountFromWallet(wallet, amount);
            } catch (err) {
                return sendErrorResponse(res, 400, "wallet deduction failed, please try again");
            }

            await B2BTransaction.create({
                reseller: req.reseller?._id,
                paymentProcessor: "wallet",
                product: "a2a",
                processId: orderId,
                description: "A2a booking payment",
                debitAmount: amount,
                creditAmount: 0,
                directAmount: 0,
                closingBalance: wallet.balance,
                dueAmount: wallet.creditUsed,
                remark: "A2a booking payment",
                dateTime: new Date(),
            });

            for (i = 0; i < a2aOrder.passengerDetails.length; i++) {
                a2aOrder.passengerDetails[i].ticketNo = a2aTicket.pnrNo;
                a2aOrder.passengerDetails[i].status = "booked";
            }

            a2aOrder.orderStatus = "paid";
            await a2aOrder.save();

            a2aTicketSenderHelper({ a2aOrder });

            res.status(200).json({
                message: "Amount Paided successfully ",
                a2aOrder,
            });
        } catch (err) {
            console.log(err, "err");
            sendErrorResponse(res, 500, err);
        }
    },

    listAllOrders: async (req, res) => {
        try {
            const { skip = 0, limit = 10, search, dateFrom, dateTo } = req.query;

            const filter = {
                reseller: Types.ObjectId(req.reseller._id),
                orderStatus: { $ne: "pending" },
            };

            if (search && search !== "") {
                filter.$or = [
                    { referenceNumber: { $regex: search, $options: "i" } },
                    { "passengerDetails.passportNo": { $regex: search, $options: "i" } },
                    { "passengerDetails.ticketNo": { $regex: search, $options: "i" } },
                ];
            }

            if (dateFrom && dateFrom !== "" && dateTo && dateTo !== "") {
                filter.$and = [
                    { createdAt: { $gte: new Date(dateFrom) } },
                    { createdAt: { $lte: new Date(dateTo) } },
                ];
            } else if (dateFrom && dateFrom !== "") {
                filter["createdAt"] = {
                    $gte: new Date(dateFrom),
                };
            } else if (dateTo && dateTo !== "") {
                filter["createdAt"] = { $lte: new Date(dateTo) };
            }

            const a2aOrders = await B2BA2aOrder.aggregate([
                {
                    $match: filter,
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
                        from: "b2ba2atickets",
                        localField: "a2aTicket",
                        foreignField: "_id",
                        as: "a2aTicket",
                    },
                },
                {
                    $set: {
                        reseller: { $arrayElemAt: ["$reseller", 0] },
                        a2aTicket: { $arrayElemAt: ["$a2aTicket", 0] },
                    },
                },

                {
                    $facet: {
                        totalOrders: [{ $count: "count" }],
                        paginatedResults: [
                            { $sort: { createdAt: -1 } },
                            { $skip: Number(limit) * Number(skip) },
                            { $limit: Number(limit) },
                            {
                                $lookup: {
                                    from: "airlines",
                                    localField: "a2aTicket.airlineReturn",
                                    foreignField: "_id",
                                    as: "a2aTicket.airlineReturn",
                                },
                            },
                            {
                                $lookup: {
                                    from: "airlines",
                                    localField: "a2aTicket.airlineOnward",
                                    foreignField: "_id",
                                    as: "a2aTicket.airlineOnward",
                                },
                            },
                            {
                                $set: {
                                    "a2aTicket.airlineOnward": {
                                        $arrayElemAt: ["$a2aTicket.airlineOnward.airlineName", 0],
                                    },
                                    "a2aTicket.airlineReturn": {
                                        $arrayElemAt: ["$a2aTicket.airlineReturn.airlineName", 0],
                                    },
                                },
                            },
                            {
                                $lookup: {
                                    from: "b2ba2as",
                                    localField: "a2aTicket.a2aReference",
                                    foreignField: "_id",
                                    as: "a2aReference",
                                },
                            },
                            {
                                $set: {
                                    a2aReference: { $arrayElemAt: ["$a2aReference", 0] },
                                },
                            },
                            {
                                $lookup: {
                                    from: "countries",
                                    localField: "passengerDetails.country",
                                    foreignField: "_id",
                                    as: "country",
                                },
                            },
                            {
                                $set: {
                                    "passengerDetails.country": {
                                        $arrayElemAt: ["$country.countryName", 0],
                                    },
                                },
                            },
                            {
                                $lookup: {
                                    from: "airports",
                                    localField: "a2aReference.airportFrom",
                                    foreignField: "_id",
                                    as: "airportFrom",
                                },
                            },
                            {
                                $lookup: {
                                    from: "airports",
                                    localField: "a2aReference.airportTo",
                                    foreignField: "_id",
                                    as: "airportTo",
                                },
                            },
                            {
                                $set: {
                                    "a2aTicket.airportFromName": {
                                        $arrayElemAt: ["$airportFrom.airportName", 0],
                                    },
                                    "a2aTicket.airportFromIata": {
                                        $arrayElemAt: ["$airportFrom.iataCode", 0],
                                    },
                                    "a2aTicket.airportToName": {
                                        $arrayElemAt: ["$airportTo.airportName", 0],
                                    },
                                    "a2aTicket.airportToIata": {
                                        $arrayElemAt: ["$airportTo.iataCode", 0],
                                    },
                                },
                            },
                            {
                                $project: {
                                    reseller: {
                                        companyName: 1,
                                        address: 1,
                                        website: 1,
                                        country: 1,
                                        city: 1,
                                        zipCode: 1,
                                        designation: 1,
                                        name: 1,
                                        phoneNumber: 1,
                                        email: 1,
                                    },
                                    noOfTravellers: 1,
                                    orderedBy: 1,
                                    passengerDetails: 1,
                                    totalAmount: 1,
                                    isCancellationAvailable: 1,
                                    orderStatus: 1,
                                    referenceNumber: 1,
                                    markup: 1,
                                    createdAt: 1,

                                    a2aTicket: {
                                        airportFromName: 1,
                                        airportFromIata: 1,
                                        airportToName: 1,
                                        airportToIata: 1,
                                        a2aReference: 1,
                                        airlineOnward: 1,
                                        airlineReturn: 1,
                                        airlineOnwardNo: 1,
                                        airlineReturnNo: 1,
                                        onwardDate: 1,
                                        returnDate: 1,
                                        takeOffTimeOnward: 1,
                                        takeOffTimeReturn: 1,
                                        landingTimeOnward: 1,
                                        landingTimeReturn: 1,
                                        price: 1,
                                        infantPrice: 1,
                                        availableSeats: 1,
                                        pnrNo: 1,
                                        termsAndCond: 1,
                                        note: 1,
                                        count: 1,
                                    },
                                },
                            },
                        ],
                    },
                },
                {
                    $project: {
                        totalOrders: { $arrayElemAt: ["$totalOrders.count", 0] },
                        paginatedResults: 1,
                    },
                },
            ]);

            const totalOrders = a2aOrders[0].totalOrders || 0;
            const data = a2aOrders[0].paginatedResults;

            if (!data.length) {
                return sendErrorResponse(res, 400, "No A2A Order found");
            }

            res.status(200).json({
                result: [
                    {
                        totalOrders,
                        data,
                    },
                ],
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);

            console.log(err);
        }
    },

    downloadSummary: async (req, res) => {
        try {
            const {
                skip = 0,
                limit,
                status,
                referenceNo,
                dateFrom,
                dateTo,
                pnrNumber,
                passportNo,
                search,
            } = req.query;

            const filters1 = {
                "passengerDetails.status": {
                    $in: ["pending", "booked", "confirmed", "cancelled"],
                },
            };

            if (search && search !== "") {
                filters1["referenceNumber"] = { $regex: search, $options: "i" };
            }

            const filters2 = {};

            if (status && status !== "") {
                filters1["passengerDetails.status"] = status;
            }

            if (passportNo && passportNo !== "") {
                filters1["passengerDetails.passportNo"] = { $regex: passportNo, $options: "i" };
            }

            filters1["reseller._id"] = req.reseller._id;

            if (dateFrom && dateFrom !== "" && dateTo && dateTo !== "") {
                filters1.$and = [
                    { createdAt: { $gte: new Date(dateFrom) } },
                    { createdAt: { $lte: new Date(dateTo) } },
                ];
            } else if (dateFrom && dateFrom !== "") {
                filters1["createdAt"] = {
                    $gte: new Date(dateFrom),
                };
            } else if (dateTo && dateTo !== "") {
                filters1["createdAt"] = { $lte: new Date(dateTo) };
            }

            if (pnrNumber && pnrNumber !== "") {
                filters1["a2aTicket.pnrNo"] = { $regex: pnrNumber, $options: "i" };
            }

            const pipeline = [
                {
                    $match: {
                        orderStatus: { $ne: "pending" },
                    },
                },
                { $unwind: "$passengerDetails" },
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
                        from: "b2ba2atickets",
                        localField: "a2aTicket",
                        foreignField: "_id",
                        as: "a2aTicket",
                    },
                },
                {
                    $set: {
                        reseller: { $arrayElemAt: ["$reseller", 0] },
                        a2aTicket: { $arrayElemAt: ["$a2aTicket", 0] },
                    },
                },
                {
                    $match: filters1,
                },
                {
                    $facet: {
                        totalOrders: [{ $count: "count" }],
                        paginatedResults: [
                            { $sort: { createdAt: -1 } },
                            { $skip: Number(limit) * Number(skip) },
                            { $limit: Number(limit) },
                            {
                                $lookup: {
                                    from: "airlines",
                                    localField: "a2aTicket.airlineReturn",
                                    foreignField: "_id",
                                    as: "a2aTicket.airlineReturn",
                                },
                            },
                            {
                                $lookup: {
                                    from: "airlines",
                                    localField: "a2aTicket.airlineOnward",
                                    foreignField: "_id",
                                    as: "a2aTicket.airlineOnward",
                                },
                            },
                            {
                                $set: {
                                    "a2aTicket.airlineOnward": {
                                        $arrayElemAt: ["$a2aTicket.airlineOnward.airlineName", 0],
                                    },
                                    "a2aTicket.airlineReturn": {
                                        $arrayElemAt: ["$a2aTicket.airlineReturn.airlineName", 0],
                                    },
                                },
                            },
                            {
                                $lookup: {
                                    from: "b2ba2as",
                                    localField: "a2aTicket.a2aReference",
                                    foreignField: "_id",
                                    as: "a2aReference",
                                },
                            },
                            {
                                $set: {
                                    a2aReference: { $arrayElemAt: ["$a2aReference", 0] },
                                },
                            },
                            {
                                $lookup: {
                                    from: "countries",
                                    localField: "passengerDetails.country",
                                    foreignField: "_id",
                                    as: "country",
                                },
                            },
                            {
                                $set: {
                                    "passengerDetails.country": {
                                        $arrayElemAt: ["$country.countryName", 0],
                                    },
                                },
                            },
                            {
                                $lookup: {
                                    from: "airports",
                                    localField: "a2aReference.airportFrom",
                                    foreignField: "_id",
                                    as: "airportFrom",
                                },
                            },
                            {
                                $lookup: {
                                    from: "airports",
                                    localField: "a2aReference.airportTo",
                                    foreignField: "_id",
                                    as: "airportTo",
                                },
                            },
                            {
                                $set: {
                                    "a2aTicket.airportFromName": {
                                        $arrayElemAt: ["$airportFrom.airportName", 0],
                                    },
                                    "a2aTicket.airportFromIata": {
                                        $arrayElemAt: ["$airportFrom.iataCode", 0],
                                    },
                                    "a2aTicket.airportToName": {
                                        $arrayElemAt: ["$airportTo.airportName", 0],
                                    },
                                    "a2aTicket.airportToIata": {
                                        $arrayElemAt: ["$airportTo.iataCode", 0],
                                    },
                                },
                            },
                            {
                                $project: {
                                    reseller: {
                                        companyName: 1,
                                        address: 1,
                                        website: 1,
                                        country: 1,
                                        city: 1,
                                        zipCode: 1,
                                        designation: 1,
                                        name: 1,
                                        phoneNumber: 1,
                                        email: 1,
                                    },
                                    noOfTravellers: 1,
                                    orderedBy: 1,
                                    passengerDetails: 1,
                                    totalAmount: 1,
                                    isCancellationAvailable: 1,
                                    orderStatus: 1,
                                    referenceNumber: 1,
                                    markup: 1,
                                    createdAt: 1,
                                    a2aTicket: {
                                        airportFromName: 1,
                                        airportFromIata: 1,
                                        airportToName: 1,
                                        airportToIata: 1,
                                        a2aReference: 1,
                                        airlineOnward: 1,
                                        airlineReturn: 1,
                                        airlineOnwardNo: 1,
                                        airlineReturnNo: 1,
                                        onwardDate: 1,
                                        returnDate: 1,
                                        takeOffTimeOnward: 1,
                                        takeOffTimeReturn: 1,
                                        landingTimeOnward: 1,
                                        landingTimeReturn: 1,
                                        price: 1,
                                        availableSeats: 1,
                                        pnrNo: 1,
                                        termsAndCond: 1,
                                        note: 1,
                                        count: 1,
                                    },
                                },
                            },
                        ],
                    },
                },
                {
                    $project: {
                        totalOrders: { $arrayElemAt: ["$totalOrders.count", 0] },
                        paginatedResults: 1,
                    },
                },
            ];

            const a2aOrders = await B2BA2aOrder.aggregate(pipeline);

            console.log(a2aOrders[0].data, "aaa");

            if (!a2aOrders[0].paginatedResults) {
                sendErrorResponse(res, 400, "No A2A Order found");
            }

            const data = a2aOrders[0].paginatedResults;

            await createDownloadSummary(data, res);
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    singleA2aOrder: async (req, res) => {
        try {
            const { orderId } = req.params;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            const a2aOrders = await B2BA2aOrder.aggregate([
                {
                    $match: {
                        _id: Types.ObjectId(orderId),
                        reseller: Types.ObjectId(req.reseller._id),
                        orderStatus: { $ne: "pending" },
                    },
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
                        from: "b2ba2atickets",
                        localField: "a2aTicket",
                        foreignField: "_id",
                        as: "a2aTicket",
                    },
                },
                {
                    $set: {
                        reseller: { $arrayElemAt: ["$reseller", 0] },
                        a2aTicket: { $arrayElemAt: ["$a2aTicket", 0] },
                    },
                },
                {
                    $lookup: {
                        from: "airlines",
                        localField: "a2aTicket.airlineReturn",
                        foreignField: "_id",
                        as: "a2aTicket.airlineReturn",
                    },
                },
                {
                    $lookup: {
                        from: "airlines",
                        localField: "a2aTicket.airlineOnward",
                        foreignField: "_id",
                        as: "a2aTicket.airlineOnward",
                    },
                },
                {
                    $set: {
                        "a2aTicket.airlineOnward": {
                            $arrayElemAt: ["$a2aTicket.airlineOnward.airlineName", 0],
                        },
                        "a2aTicket.airlineReturn": {
                            $arrayElemAt: ["$a2aTicket.airlineReturn.airlineName", 0],
                        },
                    },
                },
                {
                    $lookup: {
                        from: "b2ba2as",
                        localField: "a2aTicket.a2aReference",
                        foreignField: "_id",
                        as: "a2aReference",
                    },
                },
                {
                    $set: {
                        a2aReference: {
                            $arrayElemAt: ["$a2aReference", 0],
                        },
                    },
                },
                {
                    $lookup: {
                        from: "airports",
                        localField: "a2aReference.airportFrom",
                        foreignField: "_id",
                        as: "airportFrom",
                    },
                },
                {
                    $lookup: {
                        from: "airports",
                        localField: "a2aReference.airportTo",
                        foreignField: "_id",
                        as: "airportTo",
                    },
                },

                {
                    $set: {
                        "a2aTicket.airportFromName": {
                            $arrayElemAt: ["$airportFrom.airportName", 0],
                        },
                        "a2aTicket.airportFromIata": {
                            $arrayElemAt: ["$airportFrom.iataCode", 0],
                        },
                        "a2aTicket.airportToName": {
                            $arrayElemAt: ["$airportTo.airportName", 0],
                        },
                        "a2aTicket.airportToIata": {
                            $arrayElemAt: ["$airportTo.iataCode", 0],
                        },
                    },
                },
                {
                    $sort: {
                        createdAt: -1,
                    },
                },
                {
                    $project: {
                        reseller: {
                            companyName: 1,
                            address: 1,
                            website: 1,
                            country: 1,
                            city: 1,
                            zipCode: 1,
                            designation: 1,
                            name: 1,
                            phoneNumber: 1,
                            email: 1,
                        },
                        noOfTravellers: 1,
                        orderedBy: 1,
                        passengerDetails: 1,
                        amount: 1,
                        totalAmount: 1,
                        isCancellationAvailable: 1,
                        orderStatus: 1,
                        referenceNumber: 1,
                        markup: 1,
                        createdAt: 1,
                        a2aTicket: {
                            airportFromName: 1,
                            airportFromIata: 1,
                            airportToName: 1,
                            airportToIata: 1,
                            a2aReference: 1,
                            airlineOnward: 1,
                            airlineReturn: 1,
                            airlineOnwardNo: 1,
                            airlineReturnNo: 1,
                            onwardDate: 1,
                            returnDate: 1,
                            takeOffTimeOnward: 1,
                            takeOffTimeReturn: 1,
                            landingTimeOnward: 1,
                            landingTimeReturn: 1,
                            price: 1,
                            availableSeats: 1,
                            pnrNo: 1,
                            termsAndCond: 1,
                            note: 1,
                            count: 1,
                        },
                    },
                },
            ]);

            res.status(200).json(a2aOrders[0]);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    singleA2aOrderPassenger: async (req, res) => {
        try {
            const { orderId, passengerId } = req.params;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            if (!isValidObjectId(passengerId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            const a2aOrder = await B2BA2aOrder.findOne({
                _id: orderId,
                "passengerDetails._id": passengerId,
                reseller: req.reseller._id,
                orderStatus: { $ne: "pending" },
            });

            if (!a2aOrder) {
                return sendErrorResponse(res, 400, "a2a order not found");
            }

            const a2aOrders = await B2BA2aOrder.aggregate([
                {
                    $match: {
                        _id: Types.ObjectId(orderId),
                        reseller: Types.ObjectId(req.reseller._id),
                        orderStatus: { $ne: "pending" },
                    },
                },
                {
                    $unwind: "$passengerDetails",
                },
                {
                    $match: {
                        "passengerDetails._id": Types.ObjectId(passengerId),
                    },
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
                        from: "b2ba2atickets",
                        localField: "a2aTicket",
                        foreignField: "_id",
                        as: "a2aTicket",
                    },
                },
                {
                    $set: {
                        reseller: { $arrayElemAt: ["$reseller", 0] },
                        a2aTicket: { $arrayElemAt: ["$a2aTicket", 0] },
                    },
                },
                {
                    $lookup: {
                        from: "airlines",
                        localField: "a2aTicket.airlineReturn",
                        foreignField: "_id",
                        as: "a2aTicket.airlineReturn",
                    },
                },
                {
                    $lookup: {
                        from: "airlines",
                        localField: "a2aTicket.airlineOnward",
                        foreignField: "_id",
                        as: "a2aTicket.airlineOnward",
                    },
                },
                {
                    $set: {
                        "a2aTicket.airlineOnward": {
                            $arrayElemAt: ["$a2aTicket.airlineOnward.airlineName", 0],
                        },
                        "a2aTicket.airlineReturn": {
                            $arrayElemAt: ["$a2aTicket.airlineReturn.airlineName", 0],
                        },
                    },
                },
                {
                    $lookup: {
                        from: "b2ba2as",
                        localField: "a2aTicket.a2aReference",
                        foreignField: "_id",
                        as: "a2aReference",
                    },
                },
                {
                    $set: {
                        a2aReference: {
                            $arrayElemAt: ["$a2aReference", 0],
                        },
                    },
                },
                {
                    $lookup: {
                        from: "countries",
                        localField: "passengerDetails.country",
                        foreignField: "_id",
                        as: "country",
                    },
                },
                {
                    $set: {
                        "passengerDetails.country": {
                            $arrayElemAt: ["$country.countryName", 0],
                        },
                    },
                },

                {
                    $lookup: {
                        from: "airports",
                        localField: "a2aReference.airportFrom",
                        foreignField: "_id",
                        as: "airportFrom",
                    },
                },
                {
                    $lookup: {
                        from: "airports",
                        localField: "a2aReference.airportTo",
                        foreignField: "_id",
                        as: "airportTo",
                    },
                },

                {
                    $set: {
                        "a2aTicket.airportFromName": {
                            $arrayElemAt: ["$airportFrom.airportName", 0],
                        },
                        "a2aTicket.airportFromIata": {
                            $arrayElemAt: ["$airportFrom.iataCode", 0],
                        },
                        "a2aTicket.airportToName": {
                            $arrayElemAt: ["$airportTo.airportName", 0],
                        },
                        "a2aTicket.airportToIata": {
                            $arrayElemAt: ["$airportTo.iataCode", 0],
                        },
                    },
                },
                {
                    $sort: {
                        createdAt: -1,
                    },
                },
                {
                    $project: {
                        reseller: {
                            companyName: 1,
                            address: 1,
                            website: 1,
                            country: 1,
                            city: 1,
                            zipCode: 1,
                            designation: 1,
                            name: 1,
                            phoneNumber: 1,
                            email: 1,
                        },
                        noOfTravellers: 1,
                        orderedBy: 1,
                        passengerDetails: 1,
                        totalAmount: 1,
                        isCancellationAvailable: 1,
                        orderStatus: 1,
                        referenceNumber: 1,
                        markup: 1,
                        createdAt: 1,
                        a2aTicket: {
                            airportFromName: 1,
                            airportFromIata: 1,
                            airportToName: 1,
                            airportToIata: 1,
                            a2aReference: 1,
                            airlineOnward: 1,
                            airlineReturn: 1,
                            airlineOnwardNo: 1,
                            airlineReturnNo: 1,
                            onwardDate: 1,
                            returnDate: 1,
                            takeOffTimeOnward: 1,
                            takeOffTimeReturn: 1,
                            landingTimeOnward: 1,
                            landingTimeReturn: 1,
                            price: 1,
                            availableSeats: 1,
                            pnrNo: 1,
                            termsAndCond: 1,
                            note: 1,
                            count: 1,
                        },
                    },
                },
            ]);

            res.status(200).json(a2aOrders[0]);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateSingleOrder: async (req, res) => {
        try {
            const { orderId, passengerId } = req.params;

            const {
                title,
                firstName,
                lastName,
                code,
                phoneNumber,
                nationality,
                passportNo,
                reference,
            } = req.body;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            if (!isValidObjectId(passengerId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            const { _, error } = b2bA2aOrderUpdateSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const a2aOrder = await B2BA2aOrder.findOne({
                _id: orderId,
                "passengerDetails._id": passengerId,
                reseller: req.reseller._id,
            });

            if (!a2aOrder) {
                return sendErrorResponse(res, 404, "A2a order not found");
            }

            const passengerIndex = a2aOrder.passengerDetails.findIndex(
                (p) => p._id.toString() === passengerId
            );

            if (passengerIndex === -1) {
                return sendErrorResponse(res, 404, "Passenger not found in A2a order");
            }

            if (a2aOrder.passengerDetails[passengerIndex].status !== "booked") {
                return sendErrorResponse(
                    res,
                    400,
                    "Name change cannot be done for non-booked passengers"
                );
            }

            if (a2aOrder.passengerDetails[passengerIndex].isCancelled) {
                return sendErrorResponse(res, 400, "Passenger has already been cancelled");
            }

            a2aOrder.passengerDetails[passengerIndex].title = title;
            a2aOrder.passengerDetails[passengerIndex].firstName = firstName;
            a2aOrder.passengerDetails[passengerIndex].lastName = lastName;
            a2aOrder.passengerDetails[passengerIndex].code = code;
            a2aOrder.passengerDetails[passengerIndex].phoneNumber = phoneNumber;
            a2aOrder.passengerDetails[passengerIndex].passportNo = passportNo;
            a2aOrder.passengerDetails[passengerIndex].nationality = nationality;
            a2aOrder.passengerDetails[passengerIndex].reference = reference;

            await a2aOrder.save();

            res.status(200).json(a2aOrder.passengerDetails[passengerIndex]);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    cancelA2aOrder: async (req, res) => {
        try {
            const { orderId, passengerId } = req.params;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            const a2aOrder = await B2BA2aOrder.findOne({
                _id: orderId,
                "passengerDetails._id": passengerId,
                reseller: req.reseller._id,
            });

            if (!a2aOrder) {
                sendErrorResponse(res, 400, "a2a order not found");
            }

            const passenger = a2aOrder.passengerDetails.find((p) => p._id == passengerId);

            if (passenger && passenger.isCancelled) {
                return sendErrorResponse(res, 400, "Passenger has already been cancelled");
            }

            const ticket = await B2BA2aTicket.findById(a2aOrder.a2aTicket);

            if (!ticket) {
                return sendErrorResponse(res, 400, "ticket not found");
            }

            // const [cancellationHours, cancellationMinutes] =
            //     ticket.cancellationTime.split(":");
            // const totalCancellationMinutes =
            //     parseInt(cancellationHours) * 60 +
            //     parseInt(cancellationMinutes);
            // const cancellationDateTime = new Date();
            // cancellationDateTime.setHours(
            //     cancellationHours,
            //     cancellationMinutes
            // );

            // const diff =
            //     onwardDateTime.getTime() - cancellationDateTime.getTime();

            const now = new Date();
            const onwardDateTime = new Date(
                `${ticket.onwardDate.toDateString()} ${ticket.takeOffTimeOnward}`
            );
            const timeDiff = (onwardDateTime.getTime() - now.getTime()) / (1000 * 60 * 60); // difference in hours
            if (timeDiff < ticket.cancellationTime) {
                sendErrorResponse(
                    res,
                    400,
                    `Order cannot be cancelled prior to ${ticket.cancellationTime} hours before departure.`
                );
            }

            let wallet = await B2BWallet.findOne({
                reseller: req.reseller?._id,
            });

            if (!wallet) {
                wallet = new B2BWallet({
                    balance: 0,
                    reseller: req.reseller?._id,
                });
                await wallet.save();
            }

            let order = await B2BA2aOrder.updateOne(
                { _id: orderId, "passengerDetails._id": passengerId },
                {
                    $set: {
                        "passengerDetails.$.isCancelled": true,
                        "passengerDetails.$.status": "cancelled",
                    },
                }
            );

            wallet.balance += passenger.amount;
            await wallet.save();

            await B2BTransaction.create({
                reseller: req.reseller?._id,
                paymentProcessor: "wallet",
                product: "a2a",
                processId: orderId,
                description: "A2a booking refund",
                debitAmount: 0,
                creditAmount: passenger.amount,
                directAmount: 0,
                closingBalance: wallet.balance,
                dueAmount: wallet.creditUsed,
                remark: "A2a booking refund",
                dateTime: new Date(),
            });

            ticket.availableSeats += Number(1);
            await ticket.save();
            // cancel the order item's markup transactions
            // for reseller and sub-agaents
            // await B2BTransaction.find({
            //     transactionType: "markup",
            //     order: orderId,
            //     orderItem: orderItemId,
            //     status: "pending",
            // }).updateMany({ status: "failed" });

            res.status(200).json({
                message: "order cancelled successfully ",
                _id: order._id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    downloadSingleTicket: async (req, res) => {
        try {
            const { orderId, passengerId } = req.params;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            if (!isValidObjectId(passengerId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            const a2aOrder = await B2BA2aOrder.findOne({
                _id: orderId,
                "passengerDetails._id": passengerId,
                // reseller: req.reseller._id,
            });

            if (!a2aOrder) {
                sendErrorResponse(res, 400, "a2a order not found");
            }

            const a2aOrders = await B2BA2aOrder.aggregate([
                {
                    $match: {
                        _id: Types.ObjectId(orderId),
                        // reseller: Types.ObjectId(req.reseller._id),
                    },
                },
                {
                    $unwind: "$passengerDetails",
                },
                {
                    $match: {
                        "passengerDetails._id": Types.ObjectId(passengerId),
                    },
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
                        from: "b2ba2atickets",
                        localField: "a2aTicket",
                        foreignField: "_id",
                        as: "a2aTicket",
                    },
                },
                {
                    $lookup: {
                        from: "countries",
                        localField: "passengerDetails.nationality",
                        foreignField: "_id",
                        as: "nationality",
                    },
                },

                {
                    $set: {
                        "passengerDetails.nationality": {
                            $arrayElemAt: ["$nationality.countryName", 0],
                        },
                        reseller: { $arrayElemAt: ["$reseller", 0] },
                        a2aTicket: { $arrayElemAt: ["$a2aTicket", 0] },
                    },
                },
                {
                    $lookup: {
                        from: "airlines",
                        localField: "a2aTicket.airlineReturn",
                        foreignField: "_id",
                        as: "a2aTicket.airlineReturn",
                    },
                },
                {
                    $lookup: {
                        from: "airlines",
                        localField: "a2aTicket.airlineOnward",
                        foreignField: "_id",
                        as: "a2aTicket.airlineOnward",
                    },
                },
                {
                    $set: {
                        "a2aTicket.airlineOnward": {
                            $arrayElemAt: ["$a2aTicket.airlineOnward.airlineName", 0],
                        },
                        "a2aTicket.airlineReturn": {
                            $arrayElemAt: ["$a2aTicket.airlineReturn.airlineName", 0],
                        },
                        "a2aTicket.airlineOnwardLogo": {
                            $arrayElemAt: ["$a2aTicket.airlineOnward.image", 0],
                        },
                        "a2aTicket.airlineReturnLogo": {
                            $arrayElemAt: ["$a2aTicket.airlineReturn.image", 0],
                        },
                    },
                },
                {
                    $lookup: {
                        from: "b2ba2as",
                        localField: "a2aTicket.a2aReference",
                        foreignField: "_id",
                        as: "a2aReference",
                    },
                },
                {
                    $set: {
                        a2aReference: {
                            $arrayElemAt: ["$a2aReference", 0],
                        },
                    },
                },

                {
                    $lookup: {
                        from: "airports",
                        localField: "a2aReference.airportFrom",
                        foreignField: "_id",
                        as: "airportFrom",
                    },
                },
                {
                    $lookup: {
                        from: "airports",
                        localField: "a2aReference.airportTo",
                        foreignField: "_id",
                        as: "airportTo",
                    },
                },

                {
                    $set: {
                        "a2aTicket.airportFromName": {
                            $arrayElemAt: ["$airportFrom.airportName", 0],
                        },
                        "a2aTicket.airportFromIata": {
                            $arrayElemAt: ["$airportFrom.iataCode", 0],
                        },
                        "a2aTicket.airportToName": {
                            $arrayElemAt: ["$airportTo.airportName", 0],
                        },
                        "a2aTicket.airportToIata": {
                            $arrayElemAt: ["$airportTo.iataCode", 0],
                        },
                    },
                },
                {
                    $project: {
                        reseller: {
                            companyName: 1,
                            address: 1,
                            website: 1,
                            country: 1,
                            city: 1,
                            zipCode: 1,
                            designation: 1,
                            name: 1,
                            phoneNumber: 1,
                            email: 1,
                        },
                        noOfTravellers: 1,
                        orderedBy: 1,
                        passengerDetails: 1,
                        totalAmount: 1,
                        isCancellationAvailable: 1,
                        orderStatus: 1,
                        referenceNumber: 1,
                        markup: 1,
                        createdAt: 1,
                        a2aTicket: {
                            airportFromName: 1,
                            airportFromIata: 1,
                            airportToName: 1,
                            airportToIata: 1,
                            a2aReference: 1,
                            airlineOnward: 1,
                            airlineReturn: 1,
                            airlineOnwardLogo: 1,
                            airlineReturnLogo: 1,
                            airlineOnwardNo: 1,
                            airlineReturnNo: 1,
                            onwardDate: 1,
                            returnDate: 1,
                            onwardDurationHr: 1,
                            onwardDurationMin: 1,
                            returnDurationHr: 1,
                            returnDurationMin: 1,
                            takeOffTimeOnward: 1,
                            takeOffTimeReturn: 1,
                            landingTimeOnward: 1,
                            landingTimeReturn: 1,
                            price: 1,
                            availableSeats: 1,
                            pnrNo: 1,
                            termsAndCond: 1,
                            note: 1,
                            count: 1,
                        },
                    },
                },
            ]);

            if (!a2aOrders[0]) {
                sendErrorResponse(res, 400, "a2a order not found");
            }

            const pdfBuffer = await createA2aSingleTicketPdf(a2aOrders[0]);

            res.set({
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${
                    a2aOrders[0].a2aTicket.pnrNo || "a2aTicket"
                }.pdf"`,
            });

            res.send(pdfBuffer);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    downloadMultipleTicket: async (req, res) => {
        try {
            const { orderId } = req.params;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid orders id");
            }

            const a2aOrder = await B2BA2aOrder.findOne({
                _id: orderId,
                // reseller: req.reseller._id,
            });

            if (!a2aOrder) {
                sendErrorResponse(res, 400, "a2a order not found");
            }

            const a2aOrders = await B2BA2aOrder.aggregate([
                {
                    $match: {
                        _id: Types.ObjectId(orderId),
                        // reseller: Types.ObjectId(req.reseller._id),
                    },
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
                        from: "b2ba2atickets",
                        localField: "a2aTicket",
                        foreignField: "_id",
                        as: "a2aTicket",
                    },
                },
                {
                    $lookup: {
                        from: "countries",
                        localField: "passengerDetails.nationality",
                        foreignField: "_id",
                        as: "nationality",
                    },
                },
                {
                    $set: {
                        "passengerDetails.nationality": {
                            $arrayElemAt: ["$nationality.countryName", 0],
                        },
                        reseller: { $arrayElemAt: ["$reseller", 0] },
                        a2aTicket: { $arrayElemAt: ["$a2aTicket", 0] },
                    },
                },
                {
                    $lookup: {
                        from: "airlines",
                        localField: "a2aTicket.airlineReturn",
                        foreignField: "_id",
                        as: "a2aTicket.airlineReturn",
                    },
                },
                {
                    $lookup: {
                        from: "airlines",
                        localField: "a2aTicket.airlineOnward",
                        foreignField: "_id",
                        as: "a2aTicket.airlineOnward",
                    },
                },
                {
                    $set: {
                        "a2aTicket.airlineOnward": {
                            $arrayElemAt: ["$a2aTicket.airlineOnward.airlineName", 0],
                        },
                        "a2aTicket.airlineReturn": {
                            $arrayElemAt: ["$a2aTicket.airlineReturn.airlineName", 0],
                        },
                        "a2aTicket.airlineOnwardLogo": {
                            $arrayElemAt: ["$a2aTicket.airlineOnward.image", 0],
                        },
                        "a2aTicket.airlineReturnLogo": {
                            $arrayElemAt: ["$a2aTicket.airlineReturn.image", 0],
                        },
                    },
                },
                {
                    $lookup: {
                        from: "b2ba2as",
                        localField: "a2aTicket.a2aReference",
                        foreignField: "_id",
                        as: "a2aReference",
                    },
                },
                {
                    $set: {
                        a2aReference: {
                            $arrayElemAt: ["$a2aReference", 0],
                        },
                    },
                },
                {
                    $lookup: {
                        from: "countries",
                        localField: "passengerDetails.country",
                        foreignField: "_id",
                        as: "country",
                    },
                },
                {
                    $set: {
                        "passengerDetails.country": {
                            $arrayElemAt: ["$country.countryName", 0],
                        },
                    },
                },

                {
                    $lookup: {
                        from: "airports",
                        localField: "a2aReference.airportFrom",
                        foreignField: "_id",
                        as: "airportFrom",
                    },
                },
                {
                    $lookup: {
                        from: "airports",
                        localField: "a2aReference.airportTo",
                        foreignField: "_id",
                        as: "airportTo",
                    },
                },

                {
                    $set: {
                        "a2aTicket.airportFromName": {
                            $arrayElemAt: ["$airportFrom.airportName", 0],
                        },
                        "a2aTicket.airportFromIata": {
                            $arrayElemAt: ["$airportFrom.iataCode", 0],
                        },
                        "a2aTicket.airportToName": {
                            $arrayElemAt: ["$airportTo.airportName", 0],
                        },
                        "a2aTicket.airportToIata": {
                            $arrayElemAt: ["$airportTo.iataCode", 0],
                        },
                    },
                },
                {
                    $project: {
                        reseller: {
                            companyName: 1,
                            address: 1,
                            website: 1,
                            country: 1,
                            city: 1,
                            zipCode: 1,
                            designation: 1,
                            name: 1,
                            phoneNumber: 1,
                            email: 1,
                        },
                        noOfTravellers: 1,
                        orderedBy: 1,
                        passengerDetails: 1,
                        totalAmount: 1,
                        isCancellationAvailable: 1,
                        orderStatus: 1,
                        referenceNumber: 1,
                        markup: 1,
                        createdAt: 1,
                        a2aTicket: {
                            airportFromName: 1,
                            airportFromIata: 1,
                            airportToName: 1,
                            airportToIata: 1,
                            a2aReference: 1,
                            airlineOnward: 1,
                            airlineReturn: 1,
                            airlineOnwardLogo: 1,
                            airlineReturnLogo: 1,
                            airlineOnwardNo: 1,
                            airlineReturnNo: 1,
                            onwardDate: 1,
                            returnDate: 1,
                            onwardDurationHr: 1,
                            onwardDurationMin: 1,
                            returnDurationHr: 1,
                            returnDurationMin: 1,
                            takeOffTimeOnward: 1,
                            takeOffTimeReturn: 1,
                            landingTimeOnward: 1,
                            landingTimeReturn: 1,
                            price: 1,
                            availableSeats: 1,
                            pnrNo: 1,
                            termsAndCond: 1,
                            note: 1,
                            count: 1,
                        },
                    },
                },
            ]);

            if (!a2aOrders[0]) {
                sendErrorResponse(res, 400, "a2a order not found");
            }

            const pdfBuffer = await createA2aMultipleTicketPdf(a2aOrders[0]);

            res.set({
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${
                    a2aOrders[0].a2aTicket.pnrNo || "a2aTicket"
                }.pdf"`,
            });

            res.send(pdfBuffer);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    refundA2aOrder: async (req, res) => {
        try {
            const { orderId, passengerId } = req.params;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            const a2aOrder = await B2BA2aOrder.findOne({
                _id: orderId,
                "passengerDetails._id": passengerId,
                // reseller: req.reseller._id,
            });

            const passenger = a2aOrder.passengerDetails.find((p) => p._id == passengerId);

            if (passenger && !passenger.isCancelled && passenger.isRefunded) {
                sendErrorResponse(
                    res,
                    400,
                    "Passenger has already been refunded or cannot be refunded"
                );
            }
        } catch (err) {}
    },
};
