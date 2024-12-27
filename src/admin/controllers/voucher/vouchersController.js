const { isValidObjectId } = require("mongoose");
const xl = require("excel4node");

const { sendErrorResponse } = require("../../../helpers");
const { VoucherAmendment, Voucher } = require("../../models");
const { voucherSchema } = require("../../validations/voucher/voucher.schema");
const { Airport, Attraction, Country, Driver } = require("../../../models");
const { convertMinutesTo12HourTime, formatDate } = require("../../../utils");
const { Hotel } = require("../../../models/hotel");
const { generateVoucherPdf } = require("../../helpers/voucher");
const { Vehicle } = require("../../../models/transfer");

module.exports = {
    addNewVoucher: async (req, res) => {
        try {
            const { arrivalAirportId, noOfChildren, childrenAges, noOfInfants, infantAges, tours } =
                req.body;
            const { _, error } = voucherSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (childrenAges?.length !== Number(noOfChildren)) {
                return sendErrorResponse(res, 400, "please fill all children ages");
            }

            if (infantAges?.length !== Number(noOfInfants)) {
                return sendErrorResponse(res, 400, "please fill all infants ages");
            }

            let arrivalAirport;
            if (arrivalAirportId) {
                if (!isValidObjectId(arrivalAirportId)) {
                    return sendErrorResponse(res, 400, "invalid arrival airport id");
                }
                arrivalAirport = await Airport.findOne({
                    _id: arrivalAirportId,
                    isDeleted: false,
                });
                if (!arrivalAirport) {
                    return sendErrorResponse(res, 404, "arrivalAirport not found");
                }
            }

            tours.sort((a, b) => {
                return (
                    new Date(
                        new Date(
                            new Date(a.date).setHours(
                                a.pickupTimeFrom ? a.pickupTimeFrom?.split(":")[0] : 0
                            )
                        ).setMinutes(a.pickupTimeFrom ? a.pickupTimeFrom?.split(":")[1] : 0)
                    ).getTime() -
                    new Date(
                        new Date(
                            new Date(b.date).setHours(
                                b.pickupTimeFrom ? b.pickupTimeFrom?.split(":")[0] : 0
                            )
                        ).setMinutes(b.pickupTimeFrom ? b.pickupTimeFrom?.split(":")[1] : 0)
                    ).getTime()
                );
            });

            for (const tour of tours) {
                if (tour.pickupTimeFrom) {
                    const pickupTimeFromParts = tour.pickupTimeFrom?.split(":");
                    tour.pickupTimeFrom =
                        Number(pickupTimeFromParts[0]) * 60 + Number(pickupTimeFromParts[1]);
                } else {
                    tour.pickupTimeFrom = null;
                }

                if (tour.pickupTimeTo) {
                    const pickupTimeToParts = tour.pickupTimeTo?.split(":");
                    tour.pickupTimeTo =
                        Number(pickupTimeToParts[0]) * 60 + Number(pickupTimeToParts[1]);
                } else {
                    tour.pickupTimeTo = null;
                }

                if (tour.returnTimeFrom) {
                    const returnTimeFromParts = tour.returnTimeFrom?.split(":");
                    tour.returnTimeFrom =
                        Number(returnTimeFromParts[0]) * 60 + Number(returnTimeFromParts[1]);
                } else {
                    tour.returnTimeFrom = null;
                }

                if (!tour.status) {
                    tour.status = "not-booked";
                }
            }

            const newVoucherAmendment = new VoucherAmendment({
                ...req.body,
                arrivalAirportName: arrivalAirport ? arrivalAirport?.airportName : null,
                arrivalAirportId: arrivalAirportId || null,
            });
            await newVoucherAmendment.save();

            const newVoucher = new Voucher({
                voucherAmendment: newVoucherAmendment?._id,
            });
            await newVoucher.save();

            res.status(200).json(newVoucher);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleVoucher: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid voucher id");
            }

            const voucher = await Voucher.findOne({ _id: id, isDeleted: false })
                .populate("voucherAmendment")
                .lean();
            if (!voucher) {
                return sendErrorResponse(res, 404, "voucher not found");
            }

            res.status(200).json(voucher);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateVoucher: async (req, res) => {
        try {
            const { id } = req.params;
            const { arrivalAirportId, noOfChildren, childrenAges, tours, infantAges, noOfInfants } =
                req.body;

            const { _, error } = voucherSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid voucher id");
            }

            if (childrenAges?.length !== Number(noOfChildren)) {
                return sendErrorResponse(res, 400, "please fill all children ages");
            }

            if (infantAges?.length !== Number(noOfInfants)) {
                return sendErrorResponse(res, 400, "please fill all infants ages");
            }

            let arrivalAirport;
            if (arrivalAirportId) {
                if (!isValidObjectId(arrivalAirportId)) {
                    return sendErrorResponse(res, 400, "invalid arrival airport id");
                }
                arrivalAirport = await Airport.findOne({
                    _id: arrivalAirportId,
                    isDeleted: false,
                });
                if (!arrivalAirport) {
                    return sendErrorResponse(res, 404, "arrivalAirport not found");
                }
            }

            tours.sort((a, b) => {
                return (
                    new Date(
                        new Date(
                            new Date(a.date).setHours(
                                a.pickupTimeFrom ? a.pickupTimeFrom?.split(":")[0] : 0
                            )
                        ).setMinutes(a.pickupTimeFrom ? a.pickupTimeFrom?.split(":")[1] : 0)
                    ).getTime() -
                    new Date(
                        new Date(
                            new Date(b.date).setHours(
                                b.pickupTimeFrom ? b.pickupTimeFrom?.split(":")[0] : 0
                            )
                        ).setMinutes(b.pickupTimeFrom ? b.pickupTimeFrom?.split(":")[1] : 0)
                    ).getTime()
                );
            });

            for (const tour of tours) {
                if (tour.pickupTimeFrom) {
                    const pickupTimeFromParts = tour.pickupTimeFrom?.split(":");
                    tour.pickupTimeFrom =
                        Number(pickupTimeFromParts[0]) * 60 + Number(pickupTimeFromParts[1]);
                } else {
                    tour.pickupTimeFrom = null;
                }

                if (tour.pickupTimeTo) {
                    const pickupTimeToParts = tour.pickupTimeTo?.split(":");
                    tour.pickupTimeTo =
                        Number(pickupTimeToParts[0]) * 60 + Number(pickupTimeToParts[1]);
                } else {
                    tour.pickupTimeTo = null;
                }

                if (tour.returnTimeFrom) {
                    const returnTimeFromParts = tour.returnTimeFrom?.split(":");
                    tour.returnTimeFrom =
                        Number(returnTimeFromParts[0]) * 60 + Number(returnTimeFromParts[1]);
                } else {
                    tour.returnTimeFrom = null;
                }

                if (!tour.status) {
                    tour.status = "not-booked";
                }
            }

            const voucher = await Voucher.findOne({
                _id: id,
                isDeleted: false,
            });
            if (!voucher) {
                return sendErrorResponse(res, 404, "voucher not found");
            }

            const newVoucherAmendment = new VoucherAmendment({
                ...req.body,
                arrivalAirportName: arrivalAirport ? arrivalAirport?.airportName : null,
                arrivalAirportId: arrivalAirportId || null,
            });
            await newVoucherAmendment.save();

            voucher.voucherAmendment = newVoucherAmendment?._id;
            await voucher.save();

            res.status(200).json(voucher);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllVouchers: async (req, res) => {
        try {
            const { skip = 0, limit = 10, filterBy, fromDate, toDate, referenceNumber } = req.query;

            const filters = {};
            if (filterBy && (fromDate || toDate)) {
                if (filterBy === "createdAt") {
                    if (fromDate && toDate) {
                        filters.$and = [
                            { createdAt: { $gte: new Date(fromDate) } },
                            { createdAt: { $lte: new Date(toDate) } },
                        ];
                    } else if (fromDate) {
                        filters["createdAt"] = { $gte: new Date(fromDate) };
                    } else if (toDate) {
                        filters["createdAt"] = { $lte: new Date(toDate) };
                    }
                } else if (filterBy === "checkInDate") {
                    if (fromDate && toDate) {
                        filters.$and = [
                            { "voucherAmendment.checkInDate": { $gte: new Date(fromDate) } },
                            { "voucherAmendment.checkInDate": { $lte: new Date(toDate) } },
                        ];
                    } else if (fromDate) {
                        filters["voucherAmendment.checkInDate"] = { $gte: new Date(fromDate) };
                    } else if (toDate) {
                        filters["voucherAmendment.checkInDate"] = { $lte: new Date(toDate) };
                    }
                } else if (filterBy === "checkOutDate") {
                    if (fromDate && toDate) {
                        filters.$and = [
                            { "voucherAmendment.checkOutDate": { $gte: new Date(fromDate) } },
                            { "voucherAmendment.checkOutDate": { $lte: new Date(toDate) } },
                        ];
                    } else if (fromDate) {
                        filters["voucherAmendment.checkOutDate"] = { $gte: new Date(fromDate) };
                    } else if (toDate) {
                        filters["voucherAmendment.checkOutDate"] = { $lte: new Date(toDate) };
                    }
                }
            }

            if (referenceNumber && referenceNumber !== "") {
                filters["voucherAmendment.referenceNumber"] = referenceNumber
                    ?.trim()
                    ?.toUpperCase();
            }

            const vouchers = await Voucher.aggregate([
                { $sort: { createdAt: -1 } },
                { $match: { isDeleted: false } },
                {
                    $lookup: {
                        from: "voucheramendments",
                        localField: "voucherAmendment",
                        foreignField: "_id",
                        as: "voucherAmendment",
                    },
                },
                {
                    $set: {
                        voucherAmendment: { $arrayElemAt: ["$voucherAmendment", 0] },
                    },
                },
                { $match: filters },
                {
                    $group: {
                        _id: null,
                        totalItems: { $sum: 1 },
                        data: { $push: "$$ROOT" },
                    },
                },
                {
                    $project: {
                        totalItems: 1,
                        data: {
                            $slice: ["$data", Number(limit) * Number(skip), Number(limit)],
                        },
                    },
                },
            ]);

            res.status(200).json({
                skip: Number(skip),
                limit: Number(limit),
                vouchers: vouchers[0] || { data: [], totalItems: 0 },
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllDailyReports: async (req, res) => {
        try {
            const {
                skip = 0,
                limit = 10,
                fromDate,
                toDate,
                tourName,
                pickupFrom,
                pickupTimeFrom,
                pickupTimeTo,
                referenceNumber,
                sortBy,
                passengerName,
            } = req.query;

            let filters = {};
            let sort = { combinedDateTime: 1 };

            if (tourName && tourName !== "") {
                filters["voucherAmendment.tours.tourName"] = {
                    $regex: tourName?.trim(),
                    $options: "i",
                };
            }

            if (passengerName && passengerName !== "") {
                filters["voucherAmendment.passengerName"] = {
                    $regex: passengerName,
                    $options: "i",
                };
            }

            if (referenceNumber && referenceNumber !== "") {
                filters["voucherAmendment.referenceNumber"] = referenceNumber
                    ?.trim()
                    ?.toUpperCase();
            }

            if (fromDate && toDate) {
                filters.$and = [
                    { "voucherAmendment.tours.date": { $gte: new Date(fromDate) } },
                    { "voucherAmendment.tours.date": { $lte: new Date(toDate) } },
                ];
            } else if (fromDate) {
                filters["voucherAmendment.tours.date"] = { $gte: new Date(fromDate) };
            } else if (toDate) {
                filters["voucherAmendment.tours.date"] = { $lte: new Date(toDate) };
            }

            if (pickupFrom && pickupFrom !== "") {
                filters["voucherAmendment.tours.pickupFrom"] = {
                    $regex: pickupFrom,
                    $options: "i",
                };
            }
            if (pickupTimeFrom && pickupTimeFrom !== "") {
                const pickupTimeFromParts = pickupTimeFrom?.split(":");
                const pickupTimeFromMinutes =
                    Number(pickupTimeFromParts[0]) * 60 + Number(pickupTimeFromParts[1]);
                filters["voucherAmendment.tours.pickupTimeFrom"] = { $gte: pickupTimeFromMinutes };
            }
            if (pickupTimeTo && pickupTimeTo !== "") {
                const pickupTimeToParts = pickupTimeTo?.split(":");
                const pickupTimeToMinutes =
                    Number(pickupTimeToParts[0]) * 60 + Number(pickupTimeToParts[1]);
                filters["voucherAmendment.tours.pickupTimeTo"] = { $lte: pickupTimeToMinutes };
            }

            if (sortBy && sortBy !== "") {
                if (sortBy === "onDate:desc") {
                    sort = { combinedDateTime: -1 };
                } else if (sortBy === "tourName:asc") {
                    sort = { lowerTourName: 1 };
                } else if (sortBy === "tourName:desc") {
                    sort = { lowerTourName: -1 };
                }
            }

            const vouchers = await Voucher.aggregate([
                { $match: { isDeleted: false } },
                {
                    $lookup: {
                        from: "voucheramendments",
                        localField: "voucherAmendment",
                        foreignField: "_id",
                        as: "voucherAmendment",
                    },
                },
                {
                    $set: {
                        voucherAmendment: { $arrayElemAt: ["$voucherAmendment", 0] },
                    },
                },
                { $unwind: "$voucherAmendment.tours" },
                { $match: filters },
                {
                    $addFields: {
                        dateParts: { $dateToParts: { date: "$voucherAmendment.tours.date" } },
                        timeParts: {
                            hours: {
                                $cond: [
                                    { $ne: ["$voucherAmendment.tours.pickupTimeFrom", null] },
                                    {
                                        $trunc: {
                                            $divide: ["$voucherAmendment.tours.pickupTimeFrom", 60],
                                        },
                                    },
                                    0,
                                ],
                            },
                            minutes: {
                                $cond: [
                                    { $ne: ["$voucherAmendment.tours.pickupTimeFrom", null] },
                                    {
                                        $mod: ["$voucherAmendment.tours.pickupTimeFrom", 60],
                                    },
                                    0,
                                ],
                            },
                        },
                    },
                },
                {
                    $addFields: {
                        combinedDateTime: {
                            $dateFromParts: {
                                year: "$dateParts.year",
                                month: "$dateParts.month",
                                day: "$dateParts.day",
                                hour: "$timeParts.hours",
                                minute: "$timeParts.minutes",
                                second: 0,
                                timezone: "UTC",
                            },
                        },
                        lowerTourName: {
                            $toLower: { $trim: { input: "$voucherAmendment.tours.tourName" } },
                        },
                    },
                },
                { $sort: sort },
                {
                    $project: {
                        dateParts: 0,
                        timeParts: 0,
                        combinedDateTime: 0,
                        lowerTourName: 0,
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalItems: { $sum: 1 },
                        data: { $push: "$$ROOT" },
                    },
                },
                {
                    $project: {
                        totalItems: 1,
                        data: {
                            $slice: ["$data", Number(limit) * Number(skip), Number(limit)],
                        },
                    },
                },
            ]);

            res.status(200).json({
                skip: Number(skip),
                limit: Number(limit),
                vouchers: vouchers[0] || { data: [], totalItems: 0 },
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    downloadVoucherExcel: async (req, res) => {
        try {
            const {
                skip = 0,
                limit = 10,
                fromDate,
                toDate,
                tourName,
                pickupFrom,
                pickupTimeFrom,
                pickupTimeTo,
                referenceNumber,
                sortBy,
                passengerName,
            } = req.query;

            let filters = {};
            let sort = { combinedDateTime: 1 };

            if (tourName && tourName !== "") {
                filters["voucherAmendment.tours.tourName"] = {
                    $regex: tourName?.trim(),
                    $options: "i",
                };
            }

            if (passengerName && passengerName !== "") {
                filters["voucherAmendment.passengerName"] = {
                    $regex: passengerName,
                    $options: "i",
                };
            }

            if (referenceNumber && referenceNumber !== "") {
                filters["voucherAmendment.referenceNumber"] = referenceNumber
                    ?.trim()
                    ?.toUpperCase();
            }

            if (fromDate && toDate) {
                filters.$and = [
                    { "voucherAmendment.tours.date": { $gte: new Date(fromDate) } },
                    { "voucherAmendment.tours.date": { $lte: new Date(toDate) } },
                ];
            } else if (fromDate) {
                filters["voucherAmendment.tours.date"] = { $gte: new Date(fromDate) };
            } else if (toDate) {
                filters["voucherAmendment.tours.date"] = { $lte: new Date(toDate) };
            }
            if (pickupFrom && pickupFrom !== "") {
                filters["voucherAmendment.tours.pickupFrom"] = {
                    $regex: pickupFrom,
                    $options: "i",
                };
            }
            if (pickupTimeFrom && pickupTimeFrom !== "") {
                const pickupTimeFromParts = pickupTimeFrom?.split(":");
                const pickupTimeFromMinutes =
                    Number(pickupTimeFromParts[0]) * 60 + Number(pickupTimeFromParts[1]);
                filters["voucherAmendment.tours.pickupTimeFrom"] = { $gte: pickupTimeFromMinutes };
            }
            if (pickupTimeTo && pickupTimeTo !== "") {
                const pickupTimeToParts = pickupTimeTo?.split(":");
                const pickupTimeToMinutes =
                    Number(pickupTimeToParts[0]) * 60 + Number(pickupTimeToParts[1]);
                filters["voucherAmendment.tours.pickupTimeTo"] = { $lte: pickupTimeToMinutes };
            }

            if (sortBy && sortBy !== "") {
                if (sortBy === "onDate:desc") {
                    sort = { combinedDateTime: -1 };
                } else if (sortBy === "tourName:asc") {
                    sort = { lowerTourName: 1 };
                } else if (sortBy === "tourName:desc") {
                    sort = { lowerTourName: -1 };
                }
            }

            const vouchers = await Voucher.aggregate([
                { $match: { isDeleted: false } },
                {
                    $lookup: {
                        from: "voucheramendments",
                        localField: "voucherAmendment",
                        foreignField: "_id",
                        as: "voucherAmendment",
                    },
                },
                {
                    $set: {
                        voucherAmendment: { $arrayElemAt: ["$voucherAmendment", 0] },
                    },
                },
                { $unwind: "$voucherAmendment.tours" },
                { $match: filters },
                {
                    $addFields: {
                        dateParts: { $dateToParts: { date: "$voucherAmendment.tours.date" } },
                        timeParts: {
                            hours: {
                                $cond: [
                                    { $ne: ["$voucherAmendment.tours.pickupTimeFrom", null] },
                                    {
                                        $trunc: {
                                            $divide: ["$voucherAmendment.tours.pickupTimeFrom", 60],
                                        },
                                    },
                                    0,
                                ],
                            },
                            minutes: {
                                $cond: [
                                    { $ne: ["$voucherAmendment.tours.pickupTimeFrom", null] },
                                    {
                                        $mod: ["$voucherAmendment.tours.pickupTimeFrom", 60],
                                    },
                                    0,
                                ],
                            },
                        },
                    },
                },
                {
                    $addFields: {
                        combinedDateTime: {
                            $dateFromParts: {
                                year: "$dateParts.year",
                                month: "$dateParts.month",
                                day: "$dateParts.day",
                                hour: "$timeParts.hours",
                                minute: "$timeParts.minutes",
                                second: 0,
                                timezone: "UTC",
                            },
                        },
                        lowerTourName: {
                            $toLower: { $trim: { input: "$voucherAmendment.tours.tourName" } },
                        },
                    },
                },
                { $sort: sort },
                {
                    $project: {
                        dateParts: 0,
                        timeParts: 0,
                        combinedDateTime: 0,
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalItems: { $sum: 1 },
                        data: { $push: "$$ROOT" },
                    },
                },
                {
                    $project: {
                        totalItems: 1,
                        data: {
                            $slice: ["$data", Number(limit) * Number(skip), Number(limit)],
                        },
                    },
                },
            ]);

            var wb = new xl.Workbook();
            var ws = wb.addWorksheet("vouchers-list");

            const titleStyle = wb.createStyle({
                font: {
                    bold: true,
                    size: 10,
                },
            });
            const bodyStyle = wb.createStyle({
                font: {
                    size: 10,
                },
            });

            let row = 1;
            ws.cell(row, 1).string("#").style(titleStyle);
            ws.cell(row, 2).string("Ref No").style(titleStyle);
            ws.cell(row, 3).string("On Date").style(titleStyle);
            ws.cell(row, 4).string("Passenger Name").style(titleStyle);
            ws.cell(row, 5).string("Tour Name").style(titleStyle);
            ws.cell(row, 6).string("Tour Type").style(titleStyle);
            ws.cell(row, 7).string("Pickup Time").style(titleStyle);
            ws.cell(row, 8).string("Return Time").style(titleStyle);
            ws.cell(row, 9).string("Pickup From").style(titleStyle);
            ws.cell(row, 10).string("Status").style(titleStyle);

            for (let i = 0; i < vouchers[0]?.data?.length; i++) {
                const voucher = vouchers[0]?.data[i];
                row += 1;
                ws.cell(row, 1)
                    .number(i + 1)
                    .style(bodyStyle);
                ws.cell(row, 2).string(voucher?.voucherAmendment?.referenceNumber).style(bodyStyle);
                ws.cell(row, 3)
                    .string(
                        voucher?.voucherAmendment?.tours?.date
                            ? formatDate(voucher?.voucherAmendment?.tours?.date)
                            : "N/A"
                    )
                    .style(bodyStyle);
                ws.cell(row, 4)
                    .string(
                        `${voucher?.voucherAmendment?.passengerName} - (${
                            voucher?.voucherAmendment?.noOfAdults
                        } Adults${
                            voucher?.voucherAmendment?.noOfChildren
                                ? ` + ${
                                      voucher?.voucherAmendment?.noOfChildren
                                  } Children (${voucher?.voucherAmendment?.childrenAges
                                      ?.map((item, index) => {
                                          return `${item}${
                                              index !==
                                              voucher?.voucherAmendment?.childrenAges?.length - 1
                                                  ? ", "
                                                  : ""
                                          }`;
                                      })
                                      .join("")})`
                                : ""
                        }${
                            voucher?.voucherAmendment?.noOfInfants
                                ? ` + ${
                                      voucher?.voucherAmendment?.noOfInfants
                                  } Infants (${voucher?.voucherAmendment?.infantAges
                                      ?.map((item, index) => {
                                          return `${item}${
                                              index !==
                                              voucher?.voucherAmendment?.infantAges?.length - 1
                                                  ? ", "
                                                  : ""
                                          }`;
                                      })
                                      .join("")})`
                                : ""
                        })${
                            voucher?.voucherAmendment?.basisOfTransfer
                                ? ` - ${voucher?.voucherAmendment?.basisOfTransfer}`
                                : ""
                        }`
                    )
                    .style(bodyStyle);
                ws.cell(row, 5).string(voucher?.voucherAmendment?.tours?.tourName).style(bodyStyle);
                ws.cell(row, 6)
                    .string(voucher?.voucherAmendment?.tours?.tourType || "N/A")
                    .style(bodyStyle);
                ws.cell(row, 7)
                    .string(
                        voucher?.voucherAmendment?.tours?.pickupTimeFrom
                            ? convertMinutesTo12HourTime(
                                  voucher?.voucherAmendment?.tours?.pickupTimeFrom
                              )
                            : "N/A"
                    )
                    .style(bodyStyle);
                ws.cell(row, 8)
                    .string(
                        voucher?.voucherAmendment?.tours?.returnTimeFrom
                            ? convertMinutesTo12HourTime(
                                  voucher?.voucherAmendment?.tours?.returnTimeFrom
                              )
                            : "N/A"
                    )
                    .style(bodyStyle);
                ws.cell(row, 9)
                    .string(voucher?.voucherAmendment?.tours?.pickupFrom || "N/A")
                    .style(bodyStyle);
                ws.cell(row, 10)
                    .string(voucher?.voucherAmendment?.tours?.status || "N/A")
                    .style(bodyStyle);
            }

            wb.write(`vouchers-list.xlsx`, res);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getVoucherInitialData: async (req, res) => {
        try {
            const airports = await Airport.find({ isDeleted: false, isActive: true }).sort({
                createdAt: -1,
            });
            let hotels = [];
            const country = await Country.findOne({ isocode: "AE" }).lean();
            if (country) {
                hotels = await Hotel.find({
                    country: country?._id,
                    isDeleted: false,
                    isActive: true,
                    isPublished: true,
                })
                    .select("_id hotelName")
                    .lean();
            }

            const activities = await Attraction.aggregate([
                {
                    $match: { isDeleted: false },
                },
                {
                    $lookup: {
                        from: "attractionactivities",
                        localField: "_id",
                        foreignField: "attraction",
                        as: "activities",
                        pipeline: [{ $match: { isDeleted: false } }],
                    },
                },
                { $unwind: "$activities" },
                {
                    $project: {
                        activity: {
                            name: "$activities.name",
                        },
                        title: 1,
                    },
                },
            ]);

            const vehicles = await Vehicle.find({})
                .sort({ createdAt: -1 })
                .populate("vehicleModel", "modelName")
                .populate("vehicleTrim", "trimName")
                .select("vehicleModel vehicleTrim");

            const drivers = await Driver.find({ isDeleted: false })
                .sort({ createdAt: -1 })
                .select("driverName")
                .lean();

            res.status(200).json({ airports, hotels, activities, vehicles, drivers });
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    downloadVoucherPdf: async (req, res) => {
        try {
            const { id } = req.params;
            const { dateTime } = req.query;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid voucher amendment id");
            }

            const voucher = await VoucherAmendment.findOne({ _id: id });
            if (!voucher) {
                return sendErrorResponse(res, 404, "voucher not found");
            }

            const pdfBuffer = await generateVoucherPdf({
                voucher,
                dateTime: dateTime || new Date(),
            });

            res.set({
                "Content-Type": "application/pdf",
                "Content-Disposition": "attachment; filename=tickets.pdf",
            });
            res.send(pdfBuffer);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteSingleVoucher: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid voucher id");
            }

            const voucher = await Voucher.findOneAndUpdate(
                { isDeleted: false, _id: id },
                { isDeleted: true }
            );
            if (!voucher) {
                return sendErrorResponse(res, 404, "voucher not found");
            }

            res.status(200).json({ message: "voucher successfully deleted", _id: id });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateVoucherCancellationStatus: async (req, res) => {
        try {
            const { isCancelled, voucherAmendId } = req.body;

            if (!isValidObjectId(voucherAmendId)) {
                return sendErrorResponse(res, 400, "invalid voucher id");
            }
            const voucher = await VoucherAmendment.findOneAndUpdate(
                {
                    _id: voucherAmendId,
                    isDeleted: false,
                },
                { isCancelled }
            ).lean();
            if (!voucher) {
                return sendErrorResponse(res, 400, "voucher not found");
            }

            res.status(200).json({
                message: "voucher cancellation status updated successfully",
                voucherAmendId,
                isCancelled,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateVocherSingleTourStatus: async (req, res) => {
        try {
            const { voucherAmendId, tourId, status } = req.body;

            if (!isValidObjectId(voucherAmendId)) {
                return sendErrorResponse(res, 400, "invalid voucher id");
            }
            if (!isValidObjectId(tourId)) {
                return sendErrorResponse(res, 400, "invalid tour id");
            }
            const voucher = await VoucherAmendment.findOne({
                _id: voucherAmendId,
                "tours._id": tourId,
                isDeleted: false,
            }).lean();
            if (!voucher) {
                return sendErrorResponse(res, 400, "voucher not found");
            }

            await VoucherAmendment.findOneAndUpdate(
                { _id: voucherAmendId, "tours._id": tourId },
                { "tours.$.status": status },
                { runValidators: true }
            );

            res.status(200).json({
                message: "voucher status updated successfully updated",
                status,
                voucherAmendId,
                tourId,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    downloadVoucherExcelByTourType: async (req, res) => {
        try {
            const { fromDate, toDate, referenceNumber } = req.query;

            let filters = {};
            let sort = { combinedDateTime: 1 };

            if (referenceNumber && referenceNumber !== "") {
                filters["voucherAmendment.referenceNumber"] = referenceNumber
                    ?.trim()
                    ?.toUpperCase();
            }

            if (fromDate && toDate) {
                filters.$and = [
                    { "voucherAmendment.tours.date": { $gte: new Date(fromDate) } },
                    { "voucherAmendment.tours.date": { $lte: new Date(toDate) } },
                ];
            } else if (fromDate) {
                filters["voucherAmendment.tours.date"] = { $gte: new Date(fromDate) };
            } else if (toDate) {
                filters["voucherAmendment.tours.date"] = { $lte: new Date(toDate) };
            }

            const vouchers = await Voucher.aggregate([
                { $match: { isDeleted: false } },
                {
                    $lookup: {
                        from: "voucheramendments",
                        localField: "voucherAmendment",
                        foreignField: "_id",
                        as: "voucherAmendment",
                    },
                },
                {
                    $set: {
                        voucherAmendment: { $arrayElemAt: ["$voucherAmendment", 0] },
                    },
                },
                { $unwind: "$voucherAmendment.tours" },
                { $match: filters },
                {
                    $addFields: {
                        dateParts: { $dateToParts: { date: "$voucherAmendment.tours.date" } },
                        timeParts: {
                            hours: {
                                $cond: [
                                    { $ne: ["$voucherAmendment.tours.pickupTimeFrom", null] },
                                    {
                                        $trunc: {
                                            $divide: ["$voucherAmendment.tours.pickupTimeFrom", 60],
                                        },
                                    },
                                    0,
                                ],
                            },
                            minutes: {
                                $cond: [
                                    { $ne: ["$voucherAmendment.tours.pickupTimeFrom", null] },
                                    {
                                        $mod: ["$voucherAmendment.tours.pickupTimeFrom", 60],
                                    },
                                    0,
                                ],
                            },
                        },
                    },
                },
                {
                    $addFields: {
                        combinedDateTime: {
                            $dateFromParts: {
                                year: "$dateParts.year",
                                month: "$dateParts.month",
                                day: "$dateParts.day",
                                hour: "$timeParts.hours",
                                minute: "$timeParts.minutes",
                                second: 0,
                                timezone: "UTC",
                            },
                        },
                    },
                },
                { $sort: sort },
                {
                    $project: {
                        dateParts: 0,
                        timeParts: 0,
                        combinedDateTime: 0,
                    },
                },
            ]);

            var wb = new xl.Workbook();
            var ws = wb.addWorksheet("vouchers-list");

            const titleStyle = wb.createStyle({
                font: {
                    bold: true,
                    size: 10,
                },
            });
            const bodyStyle = wb.createStyle({
                font: {
                    size: 10,
                },
            });

            const ticketOnlyTours = [];
            const arrivalTours = [];
            const departureTours = [];
            const halfDayTours = [];
            const regularTours = [];
            for (let voucher of vouchers) {
                if (voucher?.voucherAmendment?.tours?.tourType === "ticket-only") {
                    ticketOnlyTours.push(voucher);
                } else if (voucher?.voucherAmendment?.tours?.tourType === "arrival") {
                    arrivalTours.push(voucher);
                } else if (voucher?.voucherAmendment?.tours?.tourType === "departure") {
                    departureTours.push(voucher);
                } else if (voucher?.voucherAmendment?.tours?.tourType === "half-day") {
                    halfDayTours.push(voucher);
                } else {
                    regularTours.push(voucher);
                }
            }

            let row = 1;
            ws.cell(row, 1).string("#").style(titleStyle);
            ws.cell(row, 2).string("Ref No").style(titleStyle);
            ws.cell(row, 3).string("On Date").style(titleStyle);
            ws.cell(row, 4).string("Passenger Name").style(titleStyle);
            ws.cell(row, 5).string("Tour Name").style(titleStyle);
            ws.cell(row, 6).string("Tour Type").style(titleStyle);
            ws.cell(row, 7).string("Pickup Time").style(titleStyle);
            ws.cell(row, 8).string("Return Time").style(titleStyle);
            ws.cell(row, 9).string("Pickup From").style(titleStyle);
            ws.cell(row, 10).string("Status").style(titleStyle);

            const writeVoucherDataToExcel = ({ voucherData }) => {
                for (let i = 0; i < voucherData?.length; i++) {
                    const voucher = voucherData[i];
                    row += 1;

                    ws.cell(row, 1)
                        .number(i + 1)
                        .style(bodyStyle);
                    ws.cell(row, 2)
                        .string(voucher?.voucherAmendment?.referenceNumber)
                        .style(bodyStyle);
                    ws.cell(row, 3)
                        .string(
                            voucher?.voucherAmendment?.tours?.date
                                ? formatDate(voucher?.voucherAmendment?.tours?.date)
                                : "N/A"
                        )
                        .style(bodyStyle);
                    ws.cell(row, 4)
                        .string(
                            `${voucher?.voucherAmendment?.passengerName} - (${
                                voucher?.voucherAmendment?.noOfAdults
                            } Adults${
                                voucher?.voucherAmendment?.noOfChildren
                                    ? ` + ${
                                          voucher?.voucherAmendment?.noOfChildren
                                      } Children (${voucher?.voucherAmendment?.childrenAges
                                          ?.map((item, index) => {
                                              return `${item}${
                                                  index !==
                                                  voucher?.voucherAmendment?.childrenAges?.length -
                                                      1
                                                      ? ", "
                                                      : ""
                                              }`;
                                          })
                                          .join("")})`
                                    : ""
                            }${
                                voucher?.voucherAmendment?.noOfInfants
                                    ? ` + ${
                                          voucher?.voucherAmendment?.noOfInfants
                                      } Infants (${voucher?.voucherAmendment?.infantAges
                                          ?.map((item, index) => {
                                              return `${item}${
                                                  index !==
                                                  voucher?.voucherAmendment?.infantAges?.length - 1
                                                      ? ", "
                                                      : ""
                                              }`;
                                          })
                                          .join("")})`
                                    : ""
                            })${
                                voucher?.voucherAmendment?.basisOfTransfer
                                    ? ` - ${voucher?.voucherAmendment?.basisOfTransfer}`
                                    : ""
                            }`
                        )
                        .style(bodyStyle);
                    ws.cell(row, 5)
                        .string(voucher?.voucherAmendment?.tours?.tourName)
                        .style(bodyStyle);
                    ws.cell(row, 6)
                        .string(voucher?.voucherAmendment?.tours?.tourType || "N/A")
                        .style(bodyStyle);
                    ws.cell(row, 7)
                        .string(
                            voucher?.voucherAmendment?.tours?.pickupTimeFrom
                                ? convertMinutesTo12HourTime(
                                      voucher?.voucherAmendment?.tours?.pickupTimeFrom
                                  )
                                : "N/A"
                        )
                        .style(bodyStyle);
                    ws.cell(row, 8)
                        .string(
                            voucher?.voucherAmendment?.tours?.returnTimeFrom
                                ? convertMinutesTo12HourTime(
                                      voucher?.voucherAmendment?.tours?.returnTimeFrom
                                  )
                                : "N/A"
                        )
                        .style(bodyStyle);
                    ws.cell(row, 9)
                        .string(voucher?.voucherAmendment?.tours?.pickupFrom || "N/A")
                        .style(bodyStyle);
                    ws.cell(row, 10)
                        .string(voucher?.voucherAmendment?.tours?.status || "N/A")
                        .style(bodyStyle);
                }
                row += 2;
            };

            if (ticketOnlyTours?.length > 0) {
                writeVoucherDataToExcel({ voucherData: ticketOnlyTours });
            }
            if (arrivalTours?.length > 0) {
                writeVoucherDataToExcel({ voucherData: arrivalTours });
            }
            if (departureTours?.length > 0) {
                writeVoucherDataToExcel({ voucherData: departureTours });
            }
            if (halfDayTours?.length > 0) {
                writeVoucherDataToExcel({ voucherData: halfDayTours });
            }
            if (regularTours?.length > 0) {
                writeVoucherDataToExcel({ voucherData: regularTours });
            }

            wb.write(`vouchers-list.xlsx`, res);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
