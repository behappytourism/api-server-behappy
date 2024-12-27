const { B2BA2aOrder, B2BWallet, B2BTransaction, B2BA2aTicket } = require("../../../b2b/models");
const { isValidObjectId, Types } = require("mongoose");
const { sendErrorResponse } = require("../../../helpers");
const { createDownloadSummary } = require("../../helpers");

module.exports = {
    confirmBooking: async (req, res) => {
        const { orderId, passengerId } = req.params;

        if (!isValidObjectId(orderId)) {
            return sendErrorResponse(res, 400, "invalid order id");
        }

        if (!isValidObjectId(passengerId)) {
            return sendErrorResponse(res, 400, "invalid passenger id");
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

        a2aOrder.passengerDetails[passengerIndex].status = "confirmed";

        await a2aOrder.save();
        res.status(200).json({
            _id: a2aOrder._id,
            message: "Passenger updated successfully",
        });
    },

    listAllEnquiry: async (req, res) => {
        try {
            const { skip = 0, limit = 10, search } = req.query;

            const filter = {};

            if (search && search !== "") {
                filter.referenceNumber = { $regex: search, $options: "i" };
            }

            filter.orderStatus = { $ne: "pending" };

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
                result: {
                    totalOrders,
                    data,
                },
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            console.log(err);
        }
    },

    listAllSummery: async (req, res) => {
        try {
            const {
                skip = 0,
                limit = 10,
                status,
                companyName,
                referenceNo,
                dateFrom,
                dateTo,
                pnrNumber,
            } = req.query;

            const filters1 = {
                "passengerDetails.status": {
                    $in: ["pending", "booked", "confirmed", "cancelled"],
                },
            };

            if (referenceNo && referenceNo !== "") {
                filters1.referenceNumber = { $regex: referenceNo, $options: "i" };
            }

            const filters2 = {};

            if (status && status !== "") {
                filters1["passengerDetails.status"] = status;
            }

            if (companyName && companyName !== "") {
                filters1["reseller.companyName"] = { $regex: companyName, $options: "i" };
            }

            if (dateFrom && dateFrom !== "" && dateTo && dateTo !== "") {
                filters1.$and = [
                    { "a2aTicket.onwardDate": { $gte: new Date(dateFrom) } },
                    { "a2aTicket.onwardDate": { $lte: new Date(dateTo) } },
                ];
            } else if (dateFrom && dateFrom !== "") {
                filters1["a2aTicket.onwardDate"] = {
                    $gte: new Date(dateFrom),
                };
            } else if (dateTo && dateTo !== "") {
                filters1["a2aTicket.onwardDate"] = { $lte: new Date(dateTo) };
            }

            if (pnrNumber && pnrNumber !== "") {
                filters1["a2aTicket.pnrNo"] = { $regex: pnrNumber, $options: "i" };
            }

            const a2aOrders = await B2BA2aOrder.aggregate([
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
                                    passengerDetails: 1,
                                    totalAmount: 1,
                                    isCancellationAvailable: 1,
                                    orderStatus: 1,
                                    referenceNumber: 1,
                                    createdAt: 1,
                                    a2aTicket: {
                                        airportFromIata: 1,
                                        airportToIata: 1,
                                        onwardDate: 1,
                                        returnDate: 1,
                                        pnrNo: 1,
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
                result: {
                    totalOrders,
                    data,
                },
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            console.log(err);
        }
    },

    downloadSummary: async (req, res) => {
        try {
            const {
                skip = 0,
                limit,
                status,
                companyName,
                referenceNo,
                dateFrom,
                dateTo,
                pnrNumber,
            } = req.query;

            console.log(req.query, "query");

            const filters1 = {
                "passengerDetails.status": {
                    $in: ["pending", "booked", "confirmed", "cancelled"],
                },
            };

            if (referenceNo && referenceNo !== "") {
                filters1.referenceNumber = { $regex: referenceNo, $options: "i" };
            }

            const filters2 = {};

            if (status && status !== "") {
                filters1["passengerDetails.status"] = status;
            }

            if (companyName && companyName !== "") {
                filters1["reseller.companyName"] = { $regex: companyName, $options: "i" };
            }

            if (dateFrom && dateFrom !== "" && dateTo && dateTo !== "") {
                filters1.$and = [
                    { "a2aTicket.onwardDate": { $gte: new Date(dateFrom) } },
                    { "a2aTicket.onwardDate": { $lte: new Date(dateTo) } },
                ];
            } else if (dateFrom && dateFrom !== "") {
                filters1["a2aTicket.onwardDate"] = {
                    $gte: new Date(dateFrom),
                };
            } else if (dateTo && dateTo !== "") {
                filters1["a2aTicket.onwardDate"] = { $lte: new Date(dateTo) };
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
        }
    },

    confirmA2aBooking: async (req, res) => {
        try {
            const { orderId } = req.params;

            const { passengerId } = req.body;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            if (!isValidObjectId(passengerId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            const a2aOrder = await B2BA2aOrder.findOne({
                _id: orderId,
                "passengerDetails._id": passengerId,
            });

            if (!a2aOrder) {
                sendErrorResponse(res, 400, "a2a order not found");
            }

            let order = await B2BA2aOrder.updateOne(
                { _id: orderId, "passengerDetails._id": passengerId },
                {
                    $set: {
                        "passengerDetails.$.status": "confirmed",
                    },
                }
            );

            res.status(200).json({
                message: "order confirmed successfully ",
                _id: order._id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    cancelA2aBooking: async (req, res) => {
        try {
            const { orderId } = req.params;

            const { passengerId } = req.body;

            if (!isValidObjectId(orderId)) {
                return sendErrorResponse(res, 400, "invalid order id");
            }

            if (!isValidObjectId(passengerId)) {
                return sendErrorResponse(res, 400, "invalid passengerId ");
            }

            const a2aOrder = await B2BA2aOrder.findOne({
                _id: orderId,
                "passengerDetails._id": passengerId,
            });
            if (!a2aOrder) {
                sendErrorResponse(res, 400, "a2a order not found");
            }

            const passenger = a2aOrder.passengerDetails.find((p) => p._id == passengerId);

            if (passenger && passenger.isCancelled) {
                sendErrorResponse(res, 400, "Passenger has already been cancelled");
            }

            const ticket = await B2BA2aTicket.findById(a2aOrder.a2aTicket);

            if (!ticket) {
                sendErrorResponse(res, 400, "ticket not found");
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

            let b2bWallet = await B2BWallet.findOne({
                reseller: a2aOrder.reseller,
            });
            if (!b2bWallet) {
                b2bWallet = new B2BWallet({
                    balance: 0,
                    reseller: a2aOrder.reseller,
                    creditAmount: 0,
                    creditUsed: 0,
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

            ticket.availableSeats += 1;
            await ticket.save();

            if (passenger.amount > 0) {
                b2bWallet.balance += passenger.amount;
                await b2bWallet.save();

                await B2BTransaction.create({
                    reseller: a2aOrder.reseller,
                    paymentProcessor: "wallet",
                    product: "a2a",
                    processId: orderId,
                    description: "a2a cancellation refund",
                    debitAmount: 0,
                    creditAmount: passenger.amount,
                    directAmount: 0,
                    closingBalance: b2bWallet.balance,
                    dueAmount: b2bWallet.creditUsed,
                    remark: "a2a cancellation refund",
                    dateTime: new Date(),
                });
            }

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
};
