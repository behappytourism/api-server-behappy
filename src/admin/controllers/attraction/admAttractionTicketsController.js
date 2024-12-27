const fs = require("fs");
const { parse } = require("csv-parse");
const { isValidObjectId } = require("mongoose");
const xlsx = require("xlsx");
const xl = require("excel4node");

const { sendErrorResponse, createQuotationPdf } = require("../../../helpers");
const { AttractionTicket, AttractionActivity } = require("../../../models");
const { attractionTicketUploadSchema } = require("../../validations/attraction.schema");
const { B2BAttractionOrder } = require("../../../b2b/models");
const { formatDate } = require("../../../utils");
const { updateTicketCountHelper } = require("../../../helpers/attraction/attractionTicketHelper");

module.exports = {
    uploadTicket: async (req, res) => {
        try {
            const { activity } = req.body;

            const { _, error } = attractionTicketUploadSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(activity)) {
                return sendErrorResponse(res, 400, "invalid activity id");
            }
            const activityDetails = await AttractionActivity.findOne({
                _id: activity,
                isDeleted: false,
            }).populate("attraction");
            if (!activityDetails) {
                return sendErrorResponse(res, 400, "activity not found");
            }

            if (!activityDetails?.attraction) {
                return sendErrorResponse(res, 400, "attraction not found or disabled");
            }

            if (activityDetails?.attraction?.bookingType !== "ticket") {
                return sendErrorResponse(res, 400, "you can't upload ticket to type 'booking'");
            }

            if (!req.file) {
                return sendErrorResponse(res, 500, "CSV file is required");
            }

            let csvRow = 0;
            let ticketsList = [];
            let newTickets = [];
            let errorTickets = [];
            const uploadTickets = async () => {
                const allPromises = [];
                for (let i = 0; i < ticketsList?.length; i++) {
                    const uploadSingleTicket = async () => {
                        try {
                            const ticket = await AttractionTicket.findOne({
                                ticketNo: ticketsList[i]?.ticketNo?.toUpperCase(),
                                activity,
                            }).lean();
                            if (!ticket) {
                                let dateString;
                                if (ticketsList[i]?.validity === true) {
                                    var parts = ticketsList[i]?.validTill?.split("-");
                                    dateString = new Date(
                                        parts[2],
                                        parts[1] - 1,
                                        parts[0]
                                    ).toDateString();
                                }
                                const newTicket = new AttractionTicket({
                                    ticketNo: ticketsList[i]?.ticketNo,
                                    lotNo: ticketsList[i]?.lotNo,
                                    activity: ticketsList[i]?.activity,
                                    validity: ticketsList[i]?.validity,
                                    validTill: dateString,
                                    details: ticketsList[i]?.details,
                                    ticketFor: ticketsList[i]?.ticketFor?.trim()?.toLowerCase(),
                                    ticketCost: ticketsList[i]?.ticketCost,
                                });
                                await newTicket.save();
                                newTickets.push(Object(newTicket));
                            }
                        } catch (err) {
                            console.log(err);
                            errorTickets.push(ticketsList[i]?.ticketNo);
                        }
                    };
                    allPromises.push(uploadSingleTicket());
                }
                await Promise.all([...allPromises]);
            };

            fs.createReadStream(req.file?.path)
                .pipe(parse({ delimiter: "," }))
                .on("data", async function (csvrow) {
                    if (csvRow !== 0) {
                        ticketsList.push({
                            ticketNo: csvrow[0],
                            lotNo: csvrow[1],
                            activity,
                            validity: csvrow[2]?.toLowerCase() === "y",
                            validTill: csvrow[3],
                            details: csvrow[4],
                            ticketFor: csvrow[5],
                            ticketCost: csvrow[6],
                        });
                    }
                    csvRow += 1;
                })
                .on("end", async function () {
                    await uploadTickets();

                    if (errorTickets?.length > 0) {
                        return res.status(200).json({
                            status: "error",
                            message: `${errorTickets} not uploaded, please try with correct details`,
                            newTickets,
                        });
                    }

                    await updateTicketCountHelper({
                        attraction: activityDetails?.attraction?._id,
                        activity: activityDetails._id,
                        date: new Date(),
                    });

                    res.status(200).json({
                        message: "Tickets successfully uploaded",
                        status: "ok",
                        newTickets,
                    });
                })
                .on("error", function (err) {
                    sendErrorResponse(res, 400, "Something went wrong, Wile parsing CSV");
                });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleActivitiesTicket: async (req, res) => {
        try {
            const { activityId } = req.params;
            const { skip = 0, limit = 10 } = req.query;

            if (!isValidObjectId) {
                return sendErrorResponse(res, 400, "invalid activity id");
            }

            const activity = await AttractionActivity.findOne({
                isDeleted: false,
                _id: activityId,
            })
                .populate("attraction", "bookingType")
                .select("name attraction");

            if (!activity) {
                return sendErrorResponse(res, 404, "activity not found");
            }

            if (activity.attraction?.bookingType !== "ticket") {
                return sendErrorResponse(res, 400, "this type `booking` has no tickets");
            }

            const tickets = await AttractionTicket.find({
                activity: activityId,
            })
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip);

            const totalTickets = await AttractionTicket.find({
                activity: activityId,
            }).count();

            res.status(200).json({
                tickets,
                totalTickets,
                limit: Number(limit),
                skip: Number(skip),
                activity,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateTicketStatus: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid Ticket Id");
            }

            const ticket = await AttractionTicket.findById(id);

            if (!ticket) {
                return sendErrorResponse(res, 400, "Invalid Ticket Id");
            }

            if (ticket.status !== "ok") {
                return sendErrorResponse(res, 400, "Ticket Already Reserved Or Used");
            }

            if (ticket.validity) {
                if (new Date(ticket.validTill) < new Date()) {
                    return sendErrorResponse(res, 400, "Ticket Date Experied");
                }
            }

            ticket.status = "used";
            await ticket.save();

            res.status(200).json({ status: ticket?.status });
        } catch (error) {
            sendErrorResponse(res, 500, error);
        }
    },

    downloadTicket: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid Ticket Id");
            }

            let ticketData = await AttractionTicket.findById(id);

            createQuotationPdf(ticketData);

            if (!ticketData) {
                sendErrorResponse(res, 400, "Ticket Not Found");
            }

            res.status(200).json({
                ticketData,
            });
        } catch (error) {
            sendErrorResponse(res, 500, error);
        }
    },

    deleteAttractionTicket: async (req, res) => {
        try {
            const { ticketId } = req.params;

            if (!isValidObjectId(ticketId)) {
                return sendErrorResponse(res, 400, "invalid ticket id");
            }

            const ticket = await AttractionTicket.findById(ticketId);
            if (!ticket) {
                return sendErrorResponse(res, 404, "ticket not found");
            }

            if (ticket.status !== "ok") {
                return sendErrorResponse(res, 400, "sorry, this ticket can't delete");
            }

            await AttractionTicket.findByIdAndDelete(ticketId);

            res.status(200).json({
                message: "ticket successfully deleted",
                ticketNo: ticket?.ticketNo,
            });
        } catch (err) {
            sendErrorResponse(res, 400, err);
        }
    },

    singleAttractionTicket: async (req, res) => {
        try {
            const { ticketId } = req.params;

            if (!isValidObjectId(ticketId)) {
                return sendErrorResponse(res, 400, "invalid ticket id");
            }

            const ticket = await AttractionTicket.findOne({
                _id: ticketId,
            }).populate({
                path: "activity",
                populate: {
                    path: "attraction",
                    populate: { path: "destination" },
                    select: "title images logo",
                },
                select: "name description",
            });

            if (!ticket) {
                return sendErrorResponse(res, 400, "ticket not found");
            }

            res.status(200).json(ticket);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getActivityTicketsStatistics: async (req, res) => {
        try {
            const { activityId } = req.params;

            if (!isValidObjectId(activityId)) {
                return sendErrorResponse(res, 400, "invalid activity id");
            }

            const activity = await AttractionActivity.findOne({
                _id: activityId,
                isDeleted: false,
            }).populate("attraction", "bookingType");
            if (!activity) {
                return sendErrorResponse(res, 404, "activity not found");
            }

            if (activity?.attraction?.bookingType !== "ticket") {
                return sendErrorResponse(res, 400, "invalid attraction booking type");
            }

            const totalTickets = await AttractionTicket.find({
                activity: activityId,
            }).count();
            const soldTickets = await AttractionTicket.find({
                status: "used",
                activity: activityId,
            }).count();
            const expiredTickets = await AttractionTicket.find({
                status: "ok",
                validTill: { $lte: new Date() },
                activity: activityId,
            }).count();
            const availableTickets = await AttractionTicket.find({
                $or: [
                    {
                        validity: true,
                        validTill: {
                            $gte: new Date(),
                        },
                    },
                    { validity: false },
                ],
                status: "ok",
                activity: activityId,
            }).count();

            const totalAdultTickets = await AttractionTicket.find({
                activity: activityId,
                ticketFor: "adult",
            }).count();
            const adultSoldTickets = await AttractionTicket.find({
                status: "used",
                activity: activityId,
                ticketFor: "adult",
            }).count();
            const adultExpiredTickets = await AttractionTicket.find({
                status: "ok",
                validTill: { $lte: new Date() },
                activity: activityId,
                ticketFor: "adult",
            }).count();
            const adultAvailableTickets = await AttractionTicket.find({
                $or: [
                    {
                        validity: true,
                        validTill: {
                            $gte: new Date(),
                        },
                    },
                    { validity: false },
                ],
                status: "ok",
                activity: activityId,
                ticketFor: "adult",
            }).count();

            const totalChildTickets = await AttractionTicket.find({
                activity: activityId,
                ticketFor: "child",
            }).count();
            const childSoldTickets = await AttractionTicket.find({
                status: "used",
                activity: activityId,
                ticketFor: "child",
            }).count();
            const childExpiredTickets = await AttractionTicket.find({
                status: "ok",
                validTill: { $lte: new Date() },
                activity: activityId,
                ticketFor: "child",
            }).count();
            const childAvailableTickets = await AttractionTicket.find({
                $or: [
                    {
                        validity: true,
                        validTill: {
                            $gte: new Date(),
                        },
                    },
                    { validity: false },
                ],
                status: "ok",
                activity: activityId,
                ticketFor: "child",
            }).count();

            const totalCommonTickets = await AttractionTicket.find({
                activity: activityId,
                ticketFor: "common",
            }).count();
            const commonSoldTickets = await AttractionTicket.find({
                status: "used",
                activity: activityId,
                ticketFor: "common",
            }).count();
            const commonExpiredTickets = await AttractionTicket.find({
                status: "ok",
                validTill: { $lte: new Date() },
                activity: activityId,
                ticketFor: "common",
            }).count();
            const commonAvailableTickets = await AttractionTicket.find({
                $or: [
                    {
                        validity: true,
                        validTill: {
                            $gte: new Date(),
                        },
                    },
                    { validity: false },
                ],
                status: "ok",
                activity: activityId,
                ticketFor: "common",
            }).count();

            res.status(200).json({
                totalTickets,
                soldTickets,
                expiredTickets,
                availableTickets,
                totalAdultTickets,
                adultSoldTickets,
                adultExpiredTickets,
                adultAvailableTickets,
                totalChildTickets,
                childSoldTickets,
                childExpiredTickets,
                childAvailableTickets,
                totalCommonTickets,
                commonSoldTickets,
                commonExpiredTickets,
                commonAvailableTickets,
            });
        } catch (err) {
            sendErrorResponse(res, 400, err);
        }
    },

    getAllTicketsStatistics: async (req, res) => {
        try {
            const allTickets = await AttractionTicket.aggregate([
                { $match: {} },
                {
                    $group: {
                        _id: "$ticketFor",
                        count: { $sum: 1 },
                        cost: { $sum: "$ticketCost" },
                    },
                },
            ]);
            const allSoldTickets = await AttractionTicket.aggregate([
                { $match: { status: "used" } },
                {
                    $group: {
                        _id: "$ticketFor",
                        count: { $sum: 1 },
                        cost: { $sum: "$ticketCost" },
                    },
                },
            ]);
            const allExpiredTickets = await AttractionTicket.aggregate([
                { $match: { status: "ok", validTill: { $lte: new Date() } } },
                {
                    $group: {
                        _id: "$ticketFor",
                        count: { $sum: 1 },
                        cost: { $sum: "$ticketCost" },
                    },
                },
            ]);
            const allAvailableTickets = await AttractionTicket.aggregate([
                {
                    $match: {
                        status: "ok",
                        $or: [
                            {
                                validity: true,
                                validTill: {
                                    $gte: new Date(),
                                },
                            },
                            { validity: false },
                        ],
                    },
                },
                {
                    $group: {
                        _id: "$ticketFor",
                        count: { $sum: 1 },
                        cost: { $sum: "$ticketCost" },
                    },
                },
            ]);

            const totalTickets = { count: 0, cost: 0 };
            const totalAdultTickets = { count: 0, cost: 0 };
            const totalChildTickets = { count: 0, cost: 0 };
            const totalCommonTickets = { count: 0, cost: 0 };
            for (const ticket of allTickets) {
                if (ticket?._id === "adult") {
                    totalAdultTickets.count += ticket.count;
                    totalAdultTickets.cost += ticket.cost;
                } else if (ticket?._id === "child") {
                    totalChildTickets.count += ticket.count;
                    totalChildTickets.cost += ticket.cost;
                } else if (ticket?._id === "common") {
                    totalCommonTickets.count += ticket.count;
                    totalCommonTickets.cost += ticket.cost;
                }
                totalTickets.count += ticket.count;
                totalTickets.cost += ticket.cost;
            }

            const soldTickets = { count: 0, cost: 0 };
            const soldAdultTickets = { count: 0, cost: 0 };
            const soldChildTickets = { count: 0, cost: 0 };
            const soldCommonTickets = { count: 0, cost: 0 };
            for (const ticket of allSoldTickets) {
                if (ticket?._id === "adult") {
                    soldAdultTickets.count += ticket.count;
                    soldAdultTickets.cost += ticket.cost;
                } else if (ticket?._id === "child") {
                    soldChildTickets.count += ticket.count;
                    soldChildTickets.cost += ticket.cost;
                } else if (ticket?._id === "common") {
                    soldCommonTickets.count += ticket.count;
                    soldCommonTickets.cost += ticket.cost;
                }
                soldTickets.count += ticket.count;
                soldTickets.cost += ticket.cost;
            }

            const expiredTickets = { count: 0, cost: 0 };
            const expiredAdultTickets = { count: 0, cost: 0 };
            const expiredChildTickets = { count: 0, cost: 0 };
            const expiredCommonTickets = { count: 0, cost: 0 };
            for (const ticket of allExpiredTickets) {
                if (ticket?._id === "adult") {
                    expiredAdultTickets.count += ticket.count;
                    expiredAdultTickets.cost += ticket.cost;
                } else if (ticket?._id === "child") {
                    expiredChildTickets.count += ticket.count;
                    expiredChildTickets.cost += ticket.cost;
                } else if (ticket?._id === "common") {
                    expiredCommonTickets.count += ticket.count;
                    expiredCommonTickets.cost += ticket.cost;
                }
                expiredTickets.count += ticket.count;
                expiredTickets.cost += ticket.cost;
            }

            const availableTickets = { count: 0, cost: 0 };
            const availableAdultTickets = { count: 0, cost: 0 };
            const availableChildTickets = { count: 0, cost: 0 };
            const availableCommonTickets = { count: 0, cost: 0 };
            for (const ticket of allAvailableTickets) {
                if (ticket?._id === "adult") {
                    availableAdultTickets.count += ticket.count;
                    availableAdultTickets.cost += ticket.cost;
                } else if (ticket?._id === "child") {
                    availableChildTickets.count += ticket.count;
                    availableChildTickets.cost += ticket.cost;
                } else if (ticket?._id === "common") {
                    availableCommonTickets.count += ticket.count;
                    availableCommonTickets.cost += ticket.cost;
                }
                availableTickets.count += ticket.count;
                availableTickets.cost += ticket.cost;
            }

            res.status(200).json({
                totalTickets,
                totalAdultTickets,
                totalChildTickets,
                totalCommonTickets,
                soldTickets,
                soldAdultTickets,
                soldChildTickets,
                soldCommonTickets,
                expiredTickets,
                expiredAdultTickets,
                expiredChildTickets,
                expiredCommonTickets,
                availableTickets,
                availableAdultTickets,
                availableChildTickets,
                availableCommonTickets,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getActivitiesTicketsInfo: async (req, res) => {
        try {
            const { skip = 0, limit = 10, search } = req.query;

            const filters = {
                "attraction.bookingType": "ticket",
                "attraction.isDeleted": false,
                "attraction.isApiConnected": false,
            };

            if (search && search !== "") {
                filters["attraction.title"] = { $regex: search, $options: "i" };
            }

            const activitiesTicketInfo = await AttractionActivity.aggregate([
                {
                    $match: {
                        isDeleted: false,
                    },
                },
                {
                    $lookup: {
                        from: "attractions",
                        localField: "attraction",
                        foreignField: "_id",
                        as: "attraction",
                    },
                },
                {
                    $set: {
                        attraction: { $arrayElemAt: ["$attraction", 0] },
                    },
                },
                {
                    $match: filters,
                },
                {
                    $lookup: {
                        from: "attractiontickets",
                        localField: "_id",
                        foreignField: "activity",
                        as: "tickets",
                    },
                },
                {
                    $set: {
                        availableTickets: {
                            $filter: {
                                input: "$tickets",
                                as: "ticket",
                                cond: {
                                    $and: [
                                        {
                                            $or: [
                                                {
                                                    $and: [
                                                        {
                                                            $eq: ["$$ticket.validity", true],
                                                        },
                                                        {
                                                            $gte: [
                                                                "$$ticket.validTill",
                                                                new Date(),
                                                            ],
                                                        },
                                                    ],
                                                },
                                                {
                                                    $eq: ["$$ticket.validity", false],
                                                },
                                            ],
                                        },
                                        { $eq: ["$$ticket.status", "ok"] },
                                    ],
                                },
                            },
                        },
                        soldTickets: {
                            $filter: {
                                input: "$tickets",
                                as: "ticket",
                                cond: {
                                    $eq: ["$$ticket.status", "used"],
                                },
                            },
                        },
                        expiredTickets: {
                            $filter: {
                                input: "$tickets",
                                as: "ticket",
                                cond: {
                                    $and: [
                                        {
                                            $eq: ["$$ticket.status", "ok"],
                                        },
                                        {
                                            $and: [
                                                {
                                                    $eq: ["$$ticket.validity", true],
                                                },
                                                {
                                                    $lte: ["$$ticket.validTill", new Date()],
                                                },
                                            ],
                                        },
                                    ],
                                },
                            },
                        },
                    },
                },
                {
                    $project: {
                        totalTickets: { $size: "$tickets" },
                        totalTicketsCost: { $sum: "$tickets.ticketCost" },
                        availableTickets: { $size: "$availableTickets" },
                        availableTicketsCost: { $sum: "$availableTickets.ticketCost" },
                        soldTickets: { $size: "$soldTickets" },
                        soldTicketsCost: { $sum: "$soldTickets.ticketCost" },
                        expiredTickets: { $size: "$expiredTickets" },
                        expiredTicketsCost: { $sum: "$expiredTickets.ticketCost" },
                        attraction: {
                            title: 1,
                            _id: 1,
                        },
                        name: 1,
                    },
                },
                {
                    $sort: {
                        availableTickets: 1,
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalActivities: { $sum: 1 },
                        data: { $push: "$$ROOT" },
                    },
                },
                {
                    $project: {
                        totalActivities: 1,
                        data: {
                            $slice: ["$data", Number(limit) * Number(skip), Number(limit)],
                        },
                    },
                },
            ]);

            res.status(200).json({
                activitiesTicketInfo: activitiesTicketInfo[0],
                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    // checkTicket: async (req, res) => {
    //     try {
    //         const workbook = xlsx.readFile(req.file.path);
    //         const sheetName = workbook.SheetNames[0]; // Assuming the data is in the first sheet
    //         const worksheet = workbook.Sheets[sheetName];
    //         const csvData = xlsx.utils.sheet_to_csv(worksheet);
    //         let csvRow = 0;
    //         let ticketsList = [];
    //         let newTickets = [];
    //         let errorTickets = [];
    //         parse(csvData, { delimiter: "," })
    //             .on("data", async function (csvrow) {
    //                 // if (csvRow !== 0) {
    //                 ticketsList.push({
    //                     ticketNo: csvrow[0],
    //                 });
    //                 // }
    //                 csvRow += 1;
    //             })
    //             .on("end", async function () {
    //                 if (errorTickets?.length > 0) {
    //                     return res.status(200).json({
    //                         status: "error",
    //                         message: `${errorTickets} not uploaded, please try with correct details`,
    //                         ticketsList,
    //                     });
    //                 }

    //                 console.log(ticketsList.length);
    //                 let missingTickets = [];
    //                 let ticketLength = 0;
    //                 for (let i = 0; i < ticketsList.length; i++) {
    //                     console.log(ticketsList[i].ticketNo, "ticketno");
    //                     const ticket = await AttractionTicket.findOne({
    //                         ticketNo: ticketsList[i].ticketNo,
    //                     });
    //                     if (!ticket) {
    //                         return sendErrorResponse(res, 400, "no ticket found");
    //                     }
    //                     ticketLength++;
    //                     // console.log(ticket, "ticket");
    //                     ticket.status = "ok";
    //                     await ticket.save();
    //                     console.log(ticket, "ticket");

    //                     // if (attractionOrder) {
    //                     //     ticketsList[i].referenceNumber = attractionOrder.referenceNumber;
    //                     //     ticketsList[i].agentCode = attractionOrder.reseller.agentCode; // Assuming you have a reseller object and want to get the username
    //                     //     ticketsList[i].name = attractionOrder.reseller.name; // Assuming you have a reseller object and want to get the username
    //                     //     ticketsList[i].createdAt = attractionOrder.createdAt; // Assuming you have a reseller object and want to get the username
    //                     //     ticketsList[i].agentReferenceNumber =
    //                     //         attractionOrder.agentReferenceNumber; // Assuming you have a reseller object and want to get the username
    //                     // }
    //                 }
    //                 console.log(ticketLength, "tickets");

    //                 // var wb = new xl.Workbook();
    //                 // var ws = wb.addWorksheet("Orders");

    //                 // const titleStyle = wb.createStyle({
    //                 //     font: {
    //                 //         bold: true,
    //                 //     },
    //                 // });

    //                 // ws.cell(1, 1).string("Ticket No").style(titleStyle);
    //                 // ws.cell(1, 2).string("Reference Number").style(titleStyle);
    //                 // ws.cell(1, 3).string("Agent Code").style(titleStyle);
    //                 // ws.cell(1, 4).string("Agent Name").style(titleStyle);
    //                 // ws.cell(1, 5).string("Agent Ref").style(titleStyle);
    //                 // ws.cell(1, 6).string("Date").style(titleStyle);

    //                 // for (let i = 0; i < ticketsList?.length; i++) {
    //                 //     const ticket = ticketsList[i];

    //                 //     ws.cell(i + 2, 1).string(ticket?.ticketNo || "N/A");
    //                 //     ws.cell(i + 2, 2).string(ticket?.referenceNumber || "N/A");
    //                 //     ws.cell(i + 2, 3).string(ticket?.agentCode || "N/A");
    //                 //     ws.cell(i + 2, 4).string(ticket?.name || "N/A");
    //                 //     ws.cell(i + 2, 5).string(ticket?.agentReferenceNumber || "N/A");
    //                 //     ws.cell(i + 2, 6).string(
    //                 //         ticket?.createdAt ? formatDate(ticket?.createdAt) : "N/A" || "N/A"
    //                 //     );
    //                 // }

    //                 // wb.write(`FileName.xlsx`, res, function (err, stats) {
    //                 //     if (err) {
    //                 //         console.error(err);
    //                 //         return sendErrorResponse(
    //                 //             res,
    //                 //             500,
    //                 //             "Error occurred while writing the file"
    //                 //         );
    //                 //     }

    //                 //     res.setHeader(
    //                 //         "Content-Type",
    //                 //         "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    //                 //     );
    //                 //     res.setHeader("Content-Disposition", "attachment; filename=FileName.xlsx");

    //                 //     res.sendFile("FileName.xlsx", function (err) {
    //                 //         if (err) {
    //                 //             console.error(err);
    //                 //             sendErrorResponse(
    //                 //                 res,
    //                 //                 500,
    //                 //                 "Error occurred while sending the file"
    //                 //             );
    //                 //         }
    //                 //     });
    //                 // });
    //             })
    //             .on("error", function (err) {
    //                 sendErrorResponse(res, 400, "Something went wrong, Wile parsing CSV");
    //             });
    //     } catch (err) {
    //         sendErrorResponse(res, 500, err);
    //     }
    // },
    // checkTicket: async (req, res) => {
    //     try {
    //         const ticketsList = await AttractionTicket.find({
    //             status: "ok",
    //             validTill: { $lte: new Date() },
    //             activity: "65780d537e55d42deac64576",
    //         }).populate("activity");
    //         console.log(ticketsList.length, "llll");
    //         for (let i = 0; i < ticketsList.length; i++) {
    //             // const ticket = await AttractionTicket.findByIdAndDelete(ticketsList[i]._id);
    //             // console.log(ticket);
    //         }
    //         var wb = new xl.Workbook();
    //         var ws = wb.addWorksheet("Orders");
    //         const titleStyle = wb.createStyle({
    //             font: {
    //                 bold: true,
    //             },
    //         });
    //         ws.cell(1, 1).string("Ticket No").style(titleStyle);
    //         ws.cell(1, 2).string("lot Number").style(titleStyle);
    //         ws.cell(1, 3).string("Ticket For ").style(titleStyle);
    //         ws.cell(1, 4).string("Activity").style(titleStyle);
    //         ws.cell(1, 5).string("validity ").style(titleStyle);
    //         ws.cell(1, 6).string("validTill").style(titleStyle);
    //         ws.cell(1, 7).string("status").style(titleStyle);
    //         ws.cell(1, 8).string("cost").style(titleStyle);
    //         ws.cell(1, 9).string("createdAt").style(titleStyle);

    //         for (let i = 0; i < ticketsList?.length; i++) {
    //             const ticket = ticketsList[i];
    //             // console.log(ticket?.activity._id);
    //             ws.cell(i + 2, 1).string(ticket?.ticketNo || "N/A");
    //             ws.cell(i + 2, 2).string(ticket?.lotNo || "N/A");
    //             ws.cell(i + 2, 3).string(ticket?.ticketFor || "N/A");
    //             ws.cell(i + 2, 4).string(ticket?.activity?.name || "N/A");
    //             ws.cell(i + 2, 5).string(ticket?.activity._id.toString() || "N/A");
    //             ws.cell(i + 2, 6).string(formatDate(ticket?.validTill) || "N/A");
    //             ws.cell(i + 2, 7).string(ticket?.status || "N/A");
    //             ws.cell(i + 2, 8).number(ticket?.ticketCost || "N/A");

    //             ws.cell(i + 2, 9).string(
    //                 ticket?.createdAt ? formatDate(ticket?.createdAt) : "N/A" || "N/A"
    //             );
    //         }
    //         wb.write(`FileName.xlsx`, res, function (err, stats) {
    //             if (err) {
    //                 console.error(err);
    //                 return sendErrorResponse(res, 500, "Error occurred while writing the file");
    //             }
    //             res.setHeader(
    //                 "Content-Type",
    //                 "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    //             );
    //             res.setHeader("Content-Disposition", "attachment; filename=FileName.xlsx");
    //             res.sendFile("FileName.xlsx", function (err) {
    //                 if (err) {
    //                     console.error(err);
    //                     sendErrorResponse(res, 500, "Error occurred while sending the file");
    //                 }
    //             });
    //         });
    //     } catch (err) {
    //         sendErrorResponse(res, 500, err);
    //     }
    // },
    // checkTicket: async (req, res) => {
    //     try {
    //         const workbook = xlsx.readFile(req.file.path);
    //         const sheetName = workbook.SheetNames[0]; // Assuming the data is in the first sheet
    //         const worksheet = workbook.Sheets[sheetName];
    //         const csvData = xlsx.utils.sheet_to_csv(worksheet);
    //         let csvRow = 0;
    //         let ticketsList = [];
    //         let newTickets = [];
    //         let errorTickets = [];
    //         parse(csvData, { delimiter: "," })
    //             .on("data", async function (csvrow) {
    //                 if (csvRow !== 0) {
    //                     ticketsList.push({
    //                         ticketNo: csvrow[0],
    //                     });
    //                 }
    //                 csvRow += 1;
    //             })
    //             .on("end", async function () {
    //                 if (errorTickets?.length > 0) {
    //                     return res.status(200).json({
    //                         status: "error",
    //                         message: `${errorTickets} not uploaded, please try with correct details`,
    //                         ticketsList,
    //                     });
    //                 }

    //                 // console.log(ticketsList.length);
    //                 let tickets = [];
    //                 let missingTickets = [];
    //                 let ticketLength = 0;
    //                 for (let i = 0; i < ticketsList.length; i++) {
    //                     console.log(ticketsList[i].ticketNo, i, "ticketno");
    //                     const ticket = await AttractionTicket.findOne({
    //                         ticketNo: ticketsList[i].ticketNo,
    //                         $or: [
    //                             { activity: "650ad6ab54bee7d23dbb2a4b" },
    //                             { activity: "65182f2a5ede1944895011cd" },
    //                         ],
    //                     });
    //                     if (!ticket) {
    //                         console.log(ticket, "ticket not found ");

    //                         missingTickets.push(ticketsList[i].ticketNo);
    //                         // return sendErrorResponse(res, 400, "no ticket found");
    //                     } else {
    //                         console.log(ticket, "ticket");

    //                         tickets.push(ticket);
    //                     }

    //                     // ticketLength++;
    //                     // console.log(ticket, "ticket");
    //                     // ticket.status = "ok";
    //                     // await ticket.save();

    //                     // if (attractionOrder) {
    //                     //     ticketsList[i].referenceNumber = attractionOrder.referenceNumber;
    //                     //     ticketsList[i].agentCode = attractionOrder.reseller.agentCode; // Assuming you have a reseller object and want to get the username
    //                     //     ticketsList[i].name = attractionOrder.reseller.name; // Assuming you have a reseller object and want to get the username
    //                     //     ticketsList[i].createdAt = attractionOrder.createdAt; // Assuming you have a reseller object and want to get the username
    //                     //     ticketsList[i].agentReferenceNumber =
    //                     //         attractionOrder.agentReferenceNumber; // Assuming you have a reseller object and want to get the username
    //                     // }
    //                 }
    //                 console.log(ticketLength, "tickets");

    //                 var wb = new xl.Workbook();
    //                 var ws = wb.addWorksheet("Orders");

    //                 const titleStyle = wb.createStyle({
    //                     font: {
    //                         bold: true,
    //                     },
    //                 });

    //                 ws.cell(1, 1).string("Ticket No").style(titleStyle);
    //                 // ws.cell(1, 2).string("Lot Number").style(titleStyle);
    //                 // ws.cell(1, 3).string("Ticket For").style(titleStyle);
    //                 // ws.cell(1, 4).string("Status").style(titleStyle);
    //                 // // ws.cell(1, 5).string("Agent Ref").style(titleStyle);
    //                 // ws.cell(1, 5).string("Date").style(titleStyle);

    //                 for (let i = 0; i < missingTickets?.length; i++) {
    //                     const ticket = missingTickets[i];

    //                     ws.cell(i + 2, 1).string(ticket || "N/A");
    //                     // ws.cell(i + 2, 2).string(ticket?.lotNo || "N/A");
    //                     // ws.cell(i + 2, 3).string(ticket?.ticketFor || "N/A");
    //                     // ws.cell(i + 2, 4).string(ticket?.status || "N/A");
    //                     // // ws.cell(i + 2, 5).string(ticket?.agentReferenceNumber || "N/A");
    //                     // ws.cell(i + 2, 5).string(
    //                     //     ticket?.createdAt ? formatDate(ticket?.createdAt) : "N/A" || "N/A"
    //                     // );
    //                 }

    //                 wb.write(`FileName.xlsx`, res, function (err, stats) {
    //                     if (err) {
    //                         console.error(err);
    //                         return sendErrorResponse(
    //                             res,
    //                             500,
    //                             "Error occurred while writing the file"
    //                         );
    //                     }

    //                     res.setHeader(
    //                         "Content-Type",
    //                         "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    //                     );
    //                     res.setHeader("Content-Disposition", "attachment; filename=FileName.xlsx");

    //                     res.sendFile("FileName.xlsx", function (err) {
    //                         if (err) {
    //                             console.error(err);
    //                             sendErrorResponse(
    //                                 res,
    //                                 500,
    //                                 "Error occurred while sending the file"
    //                             );
    //                         }
    //                     });
    //                 });
    //             })
    //             .on("error", function (err) {
    //                 sendErrorResponse(res, 400, "Something went wrong, Wile parsing CSV");
    //             });
    //     } catch (err) {
    //         sendErrorResponse(res, 500, err);
    //     }
    // },
    checkTicket: async (req, res) => {
        try {
            const workbook = xlsx.readFile(req.file.path);
            const sheetName = workbook.SheetNames[0]; // Assuming the data is in the first sheet
            const worksheet = workbook.Sheets[sheetName];
            const csvData = xlsx.utils.sheet_to_csv(worksheet);
            let csvRow = 0;
            let ticketsList = [];
            let newTickets = [];
            let errorTickets = [];
            parse(csvData, { delimiter: "," })
                .on("data", async function (csvrow) {
                    if (csvRow !== 0) {
                        ticketsList.push({
                            ticketNo: csvrow[0],
                        });
                    }
                    csvRow += 1;
                })
                .on("end", async function () {
                    if (errorTickets?.length > 0) {
                        return res.status(200).json({
                            status: "error",
                            message: `${errorTickets} not uploaded, please try with correct details`,
                            ticketsList,
                        });
                    }

                    // console.log(ticketsList.length);
                    let tickets = [];
                    let missingTickets = [];
                    let ticketLength = 0;
                    for (let i = 0; i < ticketsList.length; i++) {
                        console.log(ticketsList[i].ticketNo, i, "ticketno");
                        const ticket = await AttractionTicket.findOne({
                            ticketNo: ticketsList[i].ticketNo,
                            $or: [
                                { activity: "650ad6ab54bee7d23dbb2a4b" },
                                { activity: "65182f2a5ede1944895011cd" },
                            ],
                        });
                        if (!ticket) {
                            console.log(ticket, "ticket not found ");

                            missingTickets.push(ticketsList[i].ticketNo);
                            // return sendErrorResponse(res, 400, "no ticket found");
                        } else {
                            console.log(ticket, "ticket");

                            tickets.push(ticket);
                        }

                        // ticketLength++;
                        // console.log(ticket, "ticket");
                        // ticket.status = "ok";
                        // await ticket.save();

                        // if (attractionOrder) {
                        //     ticketsList[i].referenceNumber = attractionOrder.referenceNumber;
                        //     ticketsList[i].agentCode = attractionOrder.reseller.agentCode; // Assuming you have a reseller object and want to get the username
                        //     ticketsList[i].name = attractionOrder.reseller.name; // Assuming you have a reseller object and want to get the username
                        //     ticketsList[i].createdAt = attractionOrder.createdAt; // Assuming you have a reseller object and want to get the username
                        //     ticketsList[i].agentReferenceNumber =
                        //         attractionOrder.agentReferenceNumber; // Assuming you have a reseller object and want to get the username
                        // }
                    }
                    console.log(ticketsList.length, "tickets length");
                    console.log(missingTickets.length, "missingTickets length");

                    var wb = new xl.Workbook();
                    var ws = wb.addWorksheet("Orders");

                    const titleStyle = wb.createStyle({
                        font: {
                            bold: true,
                        },
                    });

                    ws.cell(1, 1).string("Ticket No").style(titleStyle);
                    ws.cell(1, 2).string("Lot Number").style(titleStyle);
                    ws.cell(1, 3).string("Ticket For").style(titleStyle);
                    ws.cell(1, 4).string("Status").style(titleStyle);
                    // ws.cell(1, 5).string("Agent Ref").style(titleStyle);
                    ws.cell(1, 5).string("Date").style(titleStyle);

                    for (let i = 0; i < tickets?.length; i++) {
                        const ticket = tickets[i];

                        ws.cell(i + 2, 1).string(ticket?.ticketNo || "N/A");
                        ws.cell(i + 2, 2).string(ticket?.lotNo || "N/A");
                        ws.cell(i + 2, 3).string(ticket?.ticketFor || "N/A");
                        ws.cell(i + 2, 4).string(ticket?.status || "N/A");
                        // ws.cell(i + 2, 5).string(ticket?.agentReferenceNumber || "N/A");
                        ws.cell(i + 2, 5).string(
                            ticket?.createdAt ? formatDate(ticket?.createdAt) : "N/A" || "N/A"
                        );
                    }

                    wb.write(`FileName.xlsx`, res, function (err, stats) {
                        if (err) {
                            console.error(err);
                            return sendErrorResponse(
                                res,
                                500,
                                "Error occurred while writing the file"
                            );
                        }

                        res.setHeader(
                            "Content-Type",
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                        );
                        res.setHeader("Content-Disposition", "attachment; filename=FileName.xlsx");

                        res.sendFile("FileName.xlsx", function (err) {
                            if (err) {
                                console.error(err);
                                sendErrorResponse(
                                    res,
                                    500,
                                    "Error occurred while sending the file"
                                );
                            }
                        });
                    });
                })
                .on("error", function (err) {
                    sendErrorResponse(res, 400, "Something went wrong, Wile parsing CSV");
                });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
