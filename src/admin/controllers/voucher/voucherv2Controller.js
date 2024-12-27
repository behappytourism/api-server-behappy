const { isValidObjectId } = require("mongoose");
const xl = require("excel4node");
const moment = require("moment");

const { sendErrorResponse } = require("../../../helpers");
const { Airport, Quotation, Driver, VehicleType } = require("../../../models");
const { Hotel } = require("../../../models/hotel");
const { VoucherV2, VoucherAmendmentV2 } = require("../../models");
const {
    voucherV2Schema,
    updateVoucherTourTransferSchema,
} = require("../../validations/voucher/voucherV2.schema");
const {
    generateVoucherV2Pdf,
    checkVehicleAvailable,
    checkDriverAvailable,
} = require("../../helpers/voucher");
const { formatDate } = require("../../../utils");
const { VehicleSchedule, Vehicle } = require("../../../models/transfer");

module.exports = {
    addNewVoucher: async (req, res) => {
        try {
            const { arrivalAirportId, noOfChildren, childrenAges, tours, hotels, quotationId } =
                req.body;

            const { error } = voucherV2Schema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            if (childrenAges?.length !== Number(noOfChildren)) {
                return sendErrorResponse(res, 400, "please fill all children ages");
            }

            let quotation;
            if (quotationId) {
                if (!isValidObjectId(quotationId)) {
                    return sendErrorResponse(res, 400, "invalid quotation id");
                }
                quotation = await Quotation.findById(quotationId)
                    .select("confirmedAmendment")
                    .lean();
                if (!quotation || !quotation.confirmedAmendment) {
                    return sendErrorResponse(
                        res,
                        400,
                        "quotation not found or not fully confirmed"
                    );
                }
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
                    return sendErrorResponse(res, 404, "arrival airport not found");
                }
            }

            const sortedTours = tours?.map((item) => {
                item.tourItems = item?.tourItems?.sort((a, b) => {
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

                for (let tour of item.tourItems) {
                    tour.utcOffset = 90; // FOR UAE

                    if (tour.pickupTimeFrom) {
                        const pickupTimeFromParts = tour.pickupTimeFrom?.split(":");
                        let pickupISODateTime = moment(
                            moment(tour.date)
                                .utcOffset(0)
                                .set({
                                    hour: pickupTimeFromParts[0],
                                    minute: pickupTimeFromParts[1],
                                    second: 0,
                                    millisecond: 0,
                                })
                                .subtract(90, "minutes")
                        ).toISOString();
                        console.log("pickupISODateTime", pickupISODateTime);
                        tour.pickupISODateTime = pickupISODateTime;
                    } else {
                        tour.pickupTimeFrom = null;
                    }

                    if (tour.pickupTimeTo) {
                        const pickupTimeToParts = tour.pickupTimeTo?.split(":");
                        let pickupISOToDateTime = moment(
                            moment(tour.date)
                                .utcOffset(0)
                                .set({
                                    hour: pickupTimeToParts[0],
                                    minute: pickupTimeToParts[1],
                                    second: 0,
                                    millisecond: 0,
                                })
                                .subtract(90, "minutes")
                        ).toISOString();
                        console.log("pickupISOToDateTime", pickupISOToDateTime);
                        tour.pickupISOToDateTime = pickupISOToDateTime;
                    } else {
                        tour.pickupTimeTo = null;
                    }

                    if (tour.returnTimeFrom) {
                        const returnTimeFromParts = tour.returnTimeFrom?.split(":");
                        let returnISODateTime = moment(
                            moment(tour.date)
                                .utcOffset(0)
                                .set({
                                    hour: returnTimeFromParts[0],
                                    minute: returnTimeFromParts[1],
                                    second: 0,
                                    millisecond: 0,
                                })
                                .subtract(90, "minutes")
                        ).toISOString();
                        console.log("returnISODateTime", returnISODateTime);
                        tour.returnISODateTime = returnISODateTime;
                    } else {
                        tour.returnTimeFrom = null;
                    }

                    if (!tour.status) {
                        tour.status = "not-booked";
                    }
                }

                return item;
            });

            // Validating Hotel Array
            if (hotels && hotels?.length > 0) {
                for (let hotel of hotels) {
                    if (!isValidObjectId(hotel?.hotelId)) {
                        return sendErrorResponse(res, 400, "invalid hotel id");
                    }
                    const hotelDetail = await Hotel.findById(hotel?.hotelId)
                        .select("hotelName")
                        .lean();
                    if (!hotelDetail) {
                        return sendErrorResponse(res, 400, "hotel not found");
                    }

                    hotel.hotelName = hotelDetail.hotelName;
                }
            }

            let voucherId;
            const oldVouchers = await VoucherV2.find({}).sort({ voucherId: -1 }).limit(1);
            if (oldVouchers?.length < 1) {
                voucherId = 100000;
            } else {
                voucherId = oldVouchers[0].voucherId + 1;
            }

            const newVoucherAmendment = new VoucherAmendmentV2({
                ...req.body,
                tours: sortedTours,
                arrivalAirportName: arrivalAirport ? arrivalAirport?.airportName : null,
                arrivalAirportId: arrivalAirportId || null,
                quotation: quotation && quotation?._id,
                quotationAmendment: quotation && quotation?.confirmedAmendment,
                voucherId,
            });
            await newVoucherAmendment.save();

            const newVoucher = new VoucherV2({
                voucherAmendment: newVoucherAmendment?._id,
                voucherId,
            });
            await newVoucher.save();

            if (quotation) {
                await Quotation.findByIdAndUpdate(quotationId, {
                    isVoucherCreated: true,
                    voucherId: newVoucher?._id,
                });
            }

            res.status(200).json(newVoucher);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateVoucher: async (req, res) => {
        try {
            const { id } = req.params;
            const { arrivalAirportId, noOfChildren, childrenAges, tours, hotels } = req.body;

            const { error } = voucherV2Schema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0]?.message);
            }

            if (childrenAges?.length !== Number(noOfChildren)) {
                return sendErrorResponse(res, 400, "please fill all children ages");
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
                    return sendErrorResponse(res, 404, "arrival airport not found");
                }
            }

            // Validating and sorting tours array
            const sortedTours = tours?.map((item) => {
                item.tourItems = item?.tourItems?.sort((a, b) => {
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

                for (let tour of item.tourItems) {
                    tour.utcOffset = 90; // FOR UAE

                    if (tour.pickupTimeFrom) {
                        const pickupTimeFromParts = tour.pickupTimeFrom?.split(":");
                        let pickupISODateTime = moment(
                            moment(tour.date)
                                .utcOffset(0)
                                .set({
                                    hour: pickupTimeFromParts[0],
                                    minute: pickupTimeFromParts[1],
                                    second: 0,
                                    millisecond: 0,
                                })
                                .subtract(90, "minutes")
                        ).toISOString();
                        console.log("pickupISODateTime", pickupISODateTime);
                        tour.pickupISODateTime = pickupISODateTime;
                    } else {
                        tour.pickupTimeFrom = null;
                    }

                    if (tour.pickupTimeTo) {
                        const pickupTimeToParts = tour.pickupTimeTo?.split(":");
                        let pickupISOToDateTime = moment(
                            moment(tour.date)
                                .utcOffset(0)
                                .set({
                                    hour: pickupTimeToParts[0],
                                    minute: pickupTimeToParts[1],
                                    second: 0,
                                    millisecond: 0,
                                })
                                .subtract(90, "minutes")
                        ).toISOString();
                        console.log("pickupISOToDateTime", pickupISOToDateTime);
                        tour.pickupISOToDateTime = pickupISOToDateTime;
                    } else {
                        tour.pickupTimeTo = null;
                    }

                    if (tour.returnTimeFrom) {
                        const returnTimeFromParts = tour.returnTimeFrom?.split(":");
                        let returnISODateTime = moment(
                            moment(tour.date)
                                .utcOffset(0)
                                .set({
                                    hour: returnTimeFromParts[0],
                                    minute: returnTimeFromParts[1],
                                    second: 0,
                                    millisecond: 0,
                                })
                                .subtract(90, "minutes")
                        ).toISOString();
                        console.log("returnISODateTime", returnISODateTime);
                        tour.returnISODateTime = returnISODateTime;
                    } else {
                        tour.returnTimeFrom = null;
                    }

                    if (!tour.status) {
                        tour.status = "not-booked";
                    }
                }

                return item;
            });

            // Validating Hotel Array
            if (hotels && hotels?.length > 0) {
                for (let hotel of hotels) {
                    if (!isValidObjectId(hotel?.hotelId)) {
                        return sendErrorResponse(res, 400, "invalid hotel id");
                    }
                    const hotelDetail = await Hotel.findById(hotel?.hotelId)
                        .select("hotelName")
                        .lean();
                    if (!hotelDetail) {
                        return sendErrorResponse(res, 400, "hotel not found");
                    }

                    hotel.hotelName = hotelDetail.hotelName;
                }
            }

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid voucher id");
            }
            const voucher = await VoucherV2.findOne({
                _id: id,
                isDeleted: false,
            });
            if (!voucher) {
                return sendErrorResponse(res, 404, "voucher not found");
            }

            const newVoucherAmendment = new VoucherAmendmentV2({
                ...req.body,
                tours: sortedTours,
                arrivalAirportName: arrivalAirport ? arrivalAirport?.airportName : null,
                arrivalAirportId: arrivalAirportId || null,
                voucherId: voucher.voucherId,
            });
            await newVoucherAmendment.save();

            voucher.voucherAmendment = newVoucherAmendment?._id;
            await voucher.save();

            // Validating and removing edited or removed tour's transfers
            let vehicleSchedules = await VehicleSchedule.find({
                voucherId: voucher?._id,
                isDeleted: false,
            }).lean();

            console.log("TOTAL", vehicleSchedules?.length);

            const availableScheduleIds = [];
            for (let item of tours) {
                for (let tour of item.tourItems) {
                    for (let sc = 0; sc < vehicleSchedules?.length; sc++) {
                        let schedule = vehicleSchedules[sc];
                        console.log(
                            sc,
                            moment(schedule.fromISODateTime).isSame(tour.pickupISODateTime),
                            schedule?.tourId?.toString(),
                            tour?._id?.toString()
                        );
                        if (
                            tour.pickupISODateTime &&
                            moment(schedule.fromISODateTime).isSame(tour.pickupISODateTime) &&
                            schedule?.tourId?.toString() === tour?._id?.toString()
                        ) {
                            await VehicleSchedule.findByIdAndUpdate(vehicleSchedules[sc]?._id, {
                                voucherAmendmentId: newVoucherAmendment?._id,
                            });
                            availableScheduleIds.push(schedule?._id);
                        }

                        if (
                            tour.returnISODateTime &&
                            moment(schedule.fromISODateTime).isSame(tour.returnISODateTime) &&
                            schedule?.tourId?.toString() === tour?._id?.toString()
                        ) {
                            await VehicleSchedule.findByIdAndUpdate(vehicleSchedules[sc]?._id, {
                                voucherAmendmentId: newVoucherAmendment?._id,
                            });
                            availableScheduleIds.push(schedule?._id);
                        }
                    }
                }
            }

            if (availableScheduleIds?.length > 0) {
                vehicleSchedules = vehicleSchedules?.filter((item) => {
                    return !availableScheduleIds.some(
                        (tempId) => tempId?.toString() === item?._id?.toString()
                    );
                });
            }

            await VehicleSchedule.deleteMany({
                _id: { $in: vehicleSchedules?.map((schedule) => schedule?._id) },
            });

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

            const vouchers = await VoucherV2.aggregate([
                { $sort: { createdAt: -1 } },
                { $match: { isDeleted: false } },
                {
                    $lookup: {
                        from: "voucheramendmentv2",
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

    getSingleVoucherWithAllTours: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid voucher id");
            }

            const voucher = await VoucherV2.findOne({ _id: id, isDeleted: false })
                .populate("voucherAmendment")
                .lean();
            if (!voucher) {
                return sendErrorResponse(res, 404, "voucher not found");
            }

            if (voucher?.voucherAmendment?.tours?.length > 0) {
                let tempTours = [];
                voucher?.voucherAmendment?.tours?.forEach((element) => {
                    if (element?.tourItems?.length > 0) {
                        tempTours.push(...element?.tourItems);
                    }
                });
                voucher.voucherAmendment.tours = tempTours;
            }

            res.status(200).json(voucher);
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

            const voucher = await VoucherV2.findOne({ _id: id, isDeleted: false })
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

            let filters = { "voucherAmendment.isCancelled": false };
            let sort = { pickupISODateTime: 1 };

            if (tourName && tourName !== "") {
                filters["voucherAmendment.tours.tourItems.tourName"] = {
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
                    { "voucherAmendment.tours.tourItems.date": { $gte: new Date(fromDate) } },
                    { "voucherAmendment.tours.tourItems.date": { $lte: new Date(toDate) } },
                ];
            } else if (fromDate) {
                filters["voucherAmendment.tours.tourItems.date"] = { $gte: new Date(fromDate) };
            } else if (toDate) {
                filters["voucherAmendment.tours.tourItems.date"] = { $lte: new Date(toDate) };
            }

            if (pickupFrom && pickupFrom !== "") {
                filters["voucherAmendment.tours.tourItems.pickupFrom"] = {
                    $regex: pickupFrom,
                    $options: "i",
                };
            }
            // if (pickupTimeFrom && pickupTimeFrom !== "") {
            //     const pickupTimeFromParts = pickupTimeFrom?.split(":");
            //     const pickupTimeFromMinutes =
            //         Number(pickupTimeFromParts[0]) * 60 + Number(pickupTimeFromParts[1]);
            //     filters["voucherAmendment.tours.tourItems.pickupTimeFrom"] = {
            //         $gte: pickupTimeFromMinutes,
            //     };
            // }
            // if (pickupTimeTo && pickupTimeTo !== "") {
            //     const pickupTimeToParts = pickupTimeTo?.split(":");
            //     const pickupTimeToMinutes =
            //         Number(pickupTimeToParts[0]) * 60 + Number(pickupTimeToParts[1]);
            //     filters["voucherAmendment.tours.tourItems.pickupTimeTo"] = {
            //         $lte: pickupTimeToMinutes,
            //     };
            // }

            if (sortBy && sortBy !== "") {
                if (sortBy === "onDate:desc") {
                    sort = { pickupISODateTime: -1 };
                } else if (sortBy === "tourName:asc") {
                    sort = { lowerTourName: 1 };
                } else if (sortBy === "tourName:desc") {
                    sort = { lowerTourName: -1 };
                }
            }

            const vouchers = await VoucherV2.aggregate([
                { $match: { isDeleted: false } },
                {
                    $lookup: {
                        from: "voucheramendmentv2",
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
                { $unwind: "$voucherAmendment.tours.tourItems" },
                { $match: filters },
                {
                    $addFields: {
                        lowerTourName: {
                            $toLower: {
                                $trim: { input: "$voucherAmendment.tours.tourItems.tourName" },
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

            let filters = { "voucherAmendment.isCancelled": false };
            let sort = { combinedDateTime: 1 };

            if (tourName && tourName !== "") {
                filters["voucherAmendment.tours.tourItems.tourName"] = {
                    $regex: tourName?.trim(),
                    $options: "i",
                };
            }

            if (referenceNumber && referenceNumber !== "") {
                filters["voucherAmendment.referenceNumber"] = referenceNumber
                    ?.trim()
                    ?.toUpperCase();
            }

            if (passengerName && passengerName !== "") {
                filters["voucherAmendment.passengerName"] = {
                    $regex: passengerName,
                    $options: "i",
                };
            }

            if (fromDate && toDate) {
                filters.$and = [
                    { "voucherAmendment.tours.tourItems.date": { $gte: new Date(fromDate) } },
                    { "voucherAmendment.tours.tourItems.date": { $lte: new Date(toDate) } },
                ];
            } else if (fromDate) {
                filters["voucherAmendment.tours.tourItems.date"] = { $gte: new Date(fromDate) };
            } else if (toDate) {
                filters["voucherAmendment.tours.tourItems.date"] = { $lte: new Date(toDate) };
            }
            if (pickupFrom && pickupFrom !== "") {
                filters["voucherAmendment.tours.tourItems.pickupFrom"] = {
                    $regex: pickupFrom,
                    $options: "i",
                };
            }
            if (pickupTimeFrom && pickupTimeFrom !== "") {
                const pickupTimeFromParts = pickupTimeFrom?.split(":");
                const pickupTimeFromMinutes =
                    Number(pickupTimeFromParts[0]) * 60 + Number(pickupTimeFromParts[1]);
                filters["voucherAmendment.tours.tourItems.pickupTimeFrom"] = {
                    $gte: pickupTimeFromMinutes,
                };
            }
            if (pickupTimeTo && pickupTimeTo !== "") {
                const pickupTimeToParts = pickupTimeTo?.split(":");
                const pickupTimeToMinutes =
                    Number(pickupTimeToParts[0]) * 60 + Number(pickupTimeToParts[1]);
                filters["voucherAmendment.tours.tourItems.pickupTimeTo"] = {
                    $lte: pickupTimeToMinutes,
                };
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

            const vouchers = await VoucherV2.aggregate([
                { $match: { isDeleted: false } },
                {
                    $lookup: {
                        from: "voucheramendmentv2",
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
                { $unwind: "$voucherAmendment.tours.tourItems" },
                { $match: filters },
                {
                    $addFields: {
                        dateParts: {
                            $dateToParts: { date: "$voucherAmendment.tours.tourItems.date" },
                        },
                        timeParts: {
                            hours: {
                                $cond: [
                                    {
                                        $ne: [
                                            "$voucherAmendment.tours.tourItems.pickupTimeFrom",
                                            null,
                                        ],
                                    },
                                    {
                                        $trunc: {
                                            $divide: [
                                                "$voucherAmendment.tours.tourItems.pickupTimeFrom",
                                                60,
                                            ],
                                        },
                                    },
                                    0,
                                ],
                            },
                            minutes: {
                                $cond: [
                                    {
                                        $ne: [
                                            "$voucherAmendment.tours.tourItems.pickupTimeFrom",
                                            null,
                                        ],
                                    },
                                    {
                                        $mod: [
                                            "$voucherAmendment.tours.tourItems.pickupTimeFrom",
                                            60,
                                        ],
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
                            $toLower: {
                                $trim: { input: "$voucherAmendment.tours.tourItems.tourName" },
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
                        voucher?.voucherAmendment?.tours?.tourItems?.date
                            ? formatDate(voucher?.voucherAmendment?.tours?.tourItems?.date)
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
                        })${
                            voucher?.voucherAmendment?.basisOfTransfer
                                ? ` - ${voucher?.voucherAmendment?.basisOfTransfer}`
                                : ""
                        }`
                    )
                    .style(bodyStyle);
                ws.cell(row, 5)
                    .string(voucher?.voucherAmendment?.tours?.tourItems?.tourName)
                    .style(bodyStyle);
                ws.cell(row, 6)
                    .string(voucher?.voucherAmendment?.tours?.tourItems?.tourType || "N/A")
                    .style(bodyStyle);
                ws.cell(row, 7)
                    .string(
                        voucher?.voucherAmendment?.tours?.tourItems?.pickupISODateTime
                            ? moment(voucher?.voucherAmendment?.tours?.tourItems?.pickupISODateTime)
                                  .utcOffset(voucher?.voucherAmendment?.tours?.tourItems?.utcOffset)
                                  .format("HH:mm")
                            : "N/A"
                    )
                    .style(bodyStyle);
                ws.cell(row, 8)
                    .string(
                        voucher?.voucherAmendment?.tours?.tourItems?.returnISODateTime
                            ? moment(voucher?.voucherAmendment?.tours?.tourItems?.returnISODateTime)
                                  .utcOffset(voucher?.voucherAmendment?.tours?.tourItems?.utcOffset)
                                  .format("HH:mm")
                            : "N/A"
                    )
                    .style(bodyStyle);
                ws.cell(row, 9)
                    .string(voucher?.voucherAmendment?.tours?.tourItems?.pickupFrom || "N/A")
                    .style(bodyStyle);
                ws.cell(row, 10)
                    .string(voucher?.voucherAmendment?.tours?.tourItems?.status || "N/A")
                    .style(bodyStyle);
            }

            wb.write(`vouchers-list.xlsx`, res);
        } catch (err) {
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

            const voucher = await VoucherAmendmentV2.findOne({ _id: id }).lean();
            if (!voucher) {
                return sendErrorResponse(res, 404, "voucher not found");
            }

            if (voucher?.tours?.length > 0) {
                let tempTours = [];
                voucher?.tours?.forEach((element) => {
                    if (element?.tourItems?.length > 0) {
                        tempTours.push(...element?.tourItems);
                    }
                });
                voucher.tours = tempTours;
            }

            const pdfBuffer = await generateVoucherV2Pdf({
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

            const voucher = await VoucherV2.findOneAndUpdate(
                { isDeleted: false, _id: id },
                { isDeleted: true }
            );
            if (!voucher) {
                return sendErrorResponse(res, 404, "voucher not found");
            }

            await VehicleSchedule.deleteMany({
                voucherId: id,
            });

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
            const voucherAmendment = await VoucherAmendmentV2.findOneAndUpdate(
                {
                    _id: voucherAmendId,
                    isDeleted: false,
                },
                { isCancelled }
            ).lean();
            if (!voucherAmendment) {
                return sendErrorResponse(res, 400, "voucher not found");
            }

            await VehicleSchedule.deleteMany({
                voucherAmendmentId: voucherAmendId,
            });

            res.status(200).json({
                message: "voucher cancellation status updated successfully",
                voucherAmendId,
                isCancelled,
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
                    { "voucherAmendment.tours.tourItems.date": { $gte: new Date(fromDate) } },
                    { "voucherAmendment.tours.tourItems.date": { $lte: new Date(toDate) } },
                ];
            } else if (fromDate) {
                filters["voucherAmendment.tours.tourItems.date"] = { $gte: new Date(fromDate) };
            } else if (toDate) {
                filters["voucherAmendment.tours.tourItems.date"] = { $lte: new Date(toDate) };
            }

            const vouchers = await VoucherV2.aggregate([
                { $match: { isDeleted: false } },
                {
                    $lookup: {
                        from: "voucheramendmentv2",
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
                { $unwind: "$voucherAmendment.tours.tourItems" },
                { $match: filters },
                {
                    $addFields: {
                        dateParts: {
                            $dateToParts: { date: "$voucherAmendment.tours.tourItems.date" },
                        },
                        timeParts: {
                            hours: {
                                $cond: [
                                    {
                                        $ne: [
                                            "$voucherAmendment.tours.tourItems.pickupTimeFrom",
                                            null,
                                        ],
                                    },
                                    {
                                        $trunc: {
                                            $divide: [
                                                "$voucherAmendment.tours.tourItems.pickupTimeFrom",
                                                60,
                                            ],
                                        },
                                    },
                                    0,
                                ],
                            },
                            minutes: {
                                $cond: [
                                    {
                                        $ne: [
                                            "$voucherAmendment.tours.tourItems.pickupTimeFrom",
                                            null,
                                        ],
                                    },
                                    {
                                        $mod: [
                                            "$voucherAmendment.tours.tourItems.pickupTimeFrom",
                                            60,
                                        ],
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
                if (voucher?.voucherAmendment?.tours?.tourItems?.tourType === "ticket-only") {
                    ticketOnlyTours.push(voucher);
                } else if (voucher?.voucherAmendment?.tours?.tourItems?.tourType === "arrival") {
                    arrivalTours.push(voucher);
                } else if (voucher?.voucherAmendment?.tours?.tourItems?.tourType === "departure") {
                    departureTours.push(voucher);
                } else if (voucher?.voucherAmendment?.tours?.tourItems?.tourType === "half-day") {
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
                            voucher?.voucherAmendment?.tours?.tourItems?.date
                                ? formatDate(voucher?.voucherAmendment?.tours?.tourItems?.date)
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
                            })${
                                voucher?.voucherAmendment?.basisOfTransfer
                                    ? ` - ${voucher?.voucherAmendment?.basisOfTransfer}`
                                    : ""
                            }`
                        )
                        .style(bodyStyle);
                    ws.cell(row, 5)
                        .string(voucher?.voucherAmendment?.tours?.tourItems?.tourName)
                        .style(bodyStyle);
                    ws.cell(row, 6)
                        .string(voucher?.voucherAmendment?.tours?.tourItems?.tourType || "N/A")
                        .style(bodyStyle);
                    ws.cell(row, 7)
                        .string(
                            voucher?.voucherAmendment?.tours?.tourItems?.pickupISODateTime
                                ? moment(
                                      voucher?.voucherAmendment?.tours?.tourItems?.pickupISODateTime
                                  )
                                      .utcOffset(
                                          voucher?.voucherAmendment?.tours?.tourItems?.utcOffset
                                      )
                                      .format("HH:mm")
                                : "N/A"
                        )
                        .style(bodyStyle);
                    ws.cell(row, 8)
                        .string(
                            voucher?.voucherAmendment?.tours?.tourItems?.returnISODateTime
                                ? moment(
                                      voucher?.voucherAmendment?.tours?.tourItems?.returnISODateTime
                                  )
                                      .utcOffset(
                                          voucher?.voucherAmendment?.tours?.tourItems?.utcOffset
                                      )
                                      .format("HH:mm")
                                : "N/A"
                        )
                        .style(bodyStyle);
                    ws.cell(row, 9)
                        .string(voucher?.voucherAmendment?.tours?.tourItems?.pickupFrom || "N/A")
                        .style(bodyStyle);
                    ws.cell(row, 10)
                        .string(voucher?.voucherAmendment?.tours?.tourItems?.status || "N/A")
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

    updateVocherSingleTourStatus: async (req, res) => {
        try {
            const { voucherAmendId, tourId, status } = req.body;

            if (!isValidObjectId(voucherAmendId)) {
                return sendErrorResponse(res, 400, "invalid voucher id");
            }
            if (!isValidObjectId(tourId)) {
                return sendErrorResponse(res, 400, "invalid tour id");
            }
            const voucher = await VoucherAmendmentV2.findOne({
                _id: voucherAmendId,
                "tours.tourItems._id": tourId,
                isDeleted: false,
            }).lean();
            if (!voucher) {
                return sendErrorResponse(res, 400, "voucher not found");
            }

            let tempTours = voucher.tours.map((item) => {
                return {
                    ...item,
                    tourItems: item?.tourItems?.map((tourItem) => {
                        if (tourItem?._id?.toString() === tourId?.toString()) {
                            tourItem.status = status;
                        }
                        return tourItem;
                    }),
                };
            });

            await VoucherAmendmentV2.findOneAndUpdate(
                { _id: voucherAmendId },
                { tours: tempTours },
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

    addVoucherSingleTourTransfer: async (req, res) => {
        try {
            const { voucherId, tourId, pickupVehicle, pickupDriver, transferType, vehicleSource } =
                req.body;

            const { error } = updateVoucherTourTransferSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(voucherId)) {
                return sendErrorResponse(res, 400, "invalid voucher id");
            }
            const voucher = await VoucherV2.findById({ _id: voucherId });
            if (!voucher) {
                return sendErrorResponse(res, 400, "voucher not found");
            }

            if (!isValidObjectId(tourId)) {
                return sendErrorResponse(res, 400, "invalid tour id");
            }
            const voucherAmendment = await VoucherAmendmentV2.findById({
                _id: voucher.voucherAmendment,
                "tours.tourItems._id": tourId,
            });
            if (!voucherAmendment) {
                return sendErrorResponse(res, 400, "selected tour is not found");
            }

            let selectedTour;
            for (let tour of voucherAmendment.tours) {
                let matched = false;
                for (let tourItem of tour?.tourItems) {
                    if (tourItem?._id?.toString() === tourId?.toString()) {
                        selectedTour = tourItem;
                        matched = true;
                        break;
                    }
                }

                if (matched === true) {
                    break;
                }
            }

            if (!selectedTour) {
                return sendErrorResponse(res, 400, "selected tour is not found");
            }

            const schedules = [];
            if (transferType === "pickup-drop") {
                if (!selectedTour?.pickupISODateTime) {
                    return sendErrorResponse(
                        res,
                        400,
                        "pickup time is not mentioned for this tour"
                    );
                }
                if (!selectedTour?.returnISODateTime) {
                    return sendErrorResponse(
                        res,
                        400,
                        "return time is not mentioned for this tour"
                    );
                }

                if (selectedTour?.pickupISODateTime) {
                    const bufferedFromISODateTime = moment(
                        moment(selectedTour?.pickupISODateTime).subtract(1, "h")
                    ).toISOString();
                    const bufferedToISODateTime = moment(
                        moment(selectedTour?.pickupISODateTime).add(1, "h")
                    ).toISOString();

                    const promises = [];

                    promises.push(
                        checkVehicleAvailable({
                            vehicleId: pickupVehicle,
                            bufferedFromISODateTime,
                            bufferedToISODateTime,
                        })
                    );
                    promises.push(
                        checkDriverAvailable({
                            driverId: pickupDriver,
                            bufferedFromISODateTime,
                            bufferedToISODateTime,
                        })
                    );

                    const [isVehicleAvailable, isDriverAvailable] = await Promise.all([
                        ...promises,
                    ]);

                    if (!isVehicleAvailable) {
                        return sendErrorResponse(res, 400, "Vehicle not available");
                    }
                    if (!isDriverAvailable) {
                        return sendErrorResponse(res, 400, "driver not available");
                    }

                    schedules.push({
                        vehicleId: pickupVehicle,
                        driverId: pickupDriver,
                        utcOffset: 90,
                        fromISODateTime: selectedTour.pickupISODateTime,
                        bufferedFromISODateTime,
                        bufferedToISODateTime,
                        type: "tour",
                        voucherAmendmentId: voucherAmendment?._id,
                        voucherId: voucher?._id,
                        tourId,
                    });
                }

                if (selectedTour?.returnISODateTime) {
                    const bufferedFromISODateTime = moment(
                        moment(selectedTour?.returnISODateTime).subtract(1, "h")
                    ).toISOString();
                    const bufferedToISODateTime = moment(
                        moment(selectedTour?.returnISODateTime).add(1, "h")
                    ).toISOString();

                    const promises = [];

                    promises.push(
                        checkVehicleAvailable({
                            vehicleId: pickupVehicle,
                            bufferedFromISODateTime,
                            bufferedToISODateTime,
                        })
                    );
                    promises.push(
                        checkDriverAvailable({
                            driverId: pickupDriver,
                            bufferedFromISODateTime,
                            bufferedToISODateTime,
                        })
                    );

                    const [isVehicleAvailable, isDriverAvailable] = await Promise.all([
                        ...promises,
                    ]);

                    if (!isVehicleAvailable) {
                        return sendErrorResponse(res, 400, "Vehicle not available");
                    }
                    if (!isDriverAvailable) {
                        return sendErrorResponse(res, 400, "driver not available");
                    }

                    schedules.push({
                        vehicleId: pickupVehicle,
                        driverId: pickupDriver,
                        utcOffset: 90,
                        fromISODateTime: selectedTour.returnISODateTime,
                        bufferedFromISODateTime,
                        bufferedToISODateTime,
                        type: "tour",
                        voucherAmendmentId: voucherAmendment?._id,
                        voucherId: voucher?._id,
                        tourId,
                    });
                }
            }

            if (transferType === "disposal") {
                if (!selectedTour?.pickupISODateTime) {
                    return sendErrorResponse(
                        res,
                        400,
                        "pickup time is not mentioned for this tour"
                    );
                }

                if (selectedTour?.pickupISODateTime) {
                    const bufferedFromISODateTime = moment(
                        moment(selectedTour?.pickupISODateTime).subtract(1, "h")
                    ).toISOString();
                    const bufferedToISODateTime = moment(
                        moment(selectedTour?.pickupISODateTime).add(1, "h")
                    ).toISOString();

                    const promises = [];

                    promises.push(
                        checkVehicleAvailable({
                            vehicleId: pickupVehicle,
                            bufferedFromISODateTime,
                            bufferedToISODateTime,
                        })
                    );
                    promises.push(
                        checkDriverAvailable({
                            driverId: pickupDriver,
                            bufferedFromISODateTime,
                            bufferedToISODateTime,
                        })
                    );

                    const [isVehicleAvailable, isDriverAvailable] = await Promise.all([
                        ...promises,
                    ]);

                    if (!isVehicleAvailable) {
                        return sendErrorResponse(res, 400, "Vehicle not available");
                    }
                    if (!isDriverAvailable) {
                        return sendErrorResponse(res, 400, "driver not available");
                    }

                    schedules.push({
                        vehicleId: pickupVehicle,
                        driverId: pickupDriver,
                        utcOffset: 90,
                        fromISODateTime: selectedTour.pickupISODateTime,
                        bufferedFromISODateTime,
                        bufferedToISODateTime,
                        type: "tour",
                        voucherAmendmentId: voucherAmendment?._id,
                        voucherId: voucher?._id,
                        tourId,
                    });
                }
            }

            const vehicleScheduleIds = [];
            for (let schedule of schedules) {
                const newSchedule = await VehicleSchedule.create({ ...schedule });
                vehicleScheduleIds.push(newSchedule?._id);
            }

            const vehicleSchedules = await VehicleSchedule.find({
                _id: { $in: vehicleScheduleIds },
            })
                .populate({ path: "vehicleId", populate: "vehicleModel", select: "vehicleModel" })
                .populate("driverId", "driverName")
                .lean();

            res.status(200).json(vehicleSchedules);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleTourDetailsWithTransfers: async (req, res) => {
        try {
            const { id, tourId } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid voucher id");
            }
            const voucher = await VoucherV2.findById(id).lean();
            if (!voucher) {
                return sendErrorResponse(res, 400, "voucher not found");
            }

            if (!isValidObjectId(tourId)) {
                return sendErrorResponse(res, 400, "invalid tour id");
            }
            const voucherAmendment = await VoucherAmendmentV2.findOne({
                _id: voucher.voucherAmendment,
                "tours.tourItems._id": tourId,
            })
                .populate("tours.tourItems.qtnTransfers.vehicleType", "name")
                .lean();
            if (!voucherAmendment) {
                return sendErrorResponse(res, 400, "voucher amendment not found");
            }

            let selectedTour;
            for (let tour of voucherAmendment.tours) {
                let matched = false;
                for (let tourItem of tour?.tourItems) {
                    if (tourItem?._id?.toString() === tourId?.toString()) {
                        selectedTour = tourItem;
                        matched = true;
                        break;
                    }
                }

                if (matched === true) {
                    break;
                }
            }

            if (!selectedTour) {
                return sendErrorResponse(res, 400, "selected tour is not found");
            }

            const vehicleSchedules = await VehicleSchedule.find({
                voucherId: id,
                tourId,
                isDeleted: false,
            })
                .populate({ path: "vehicleId", populate: "vehicleModel", select: "vehicleModel" })
                .populate("driverId", "driverName")
                .lean();

            res.status(200).json({ tour: selectedTour, vehicleSchedules });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteSingleVoucherTourVehicleSchedule: async (req, res) => {
        try {
            const { scheduleId } = req.params;

            if (!isValidObjectId(scheduleId)) {
                return sendErrorResponse(res, 400, "invalid vehicle schedule id");
            }
            const vehicleSchedule = await VehicleSchedule.findOneAndUpdate(
                {
                    _id: scheduleId,
                    isDeleted: false,
                },
                { isDeleted: true }
            );
            if (!vehicleSchedule) {
                return sendErrorResponse(res, 400, "vehicle schedule not found");
            }

            res.status(200).json({
                message: "Vehicle schedule successfully deleted",
                _id: scheduleId,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getTourTransfersInitialData: async (req, res) => {
        try {
            const vehicleTypes = await VehicleType.find({ isDeleted: false })
                .sort({ createdAt: -1 })
                .lean();

            const vehicles = await Vehicle.find({})
                .sort({ createdAt: -1 })
                .populate("vehicleModel", "modelName")
                .populate("vehicleTrim", "trimName")
                .select("vehicleModel vehicleTrim vehicleType");

            const drivers = await Driver.find({ isDeleted: false })
                .sort({ createdAt: -1 })
                .select("driverName")
                .lean();

            res.status(200).json({ vehicles, vehicleTypes, drivers });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
