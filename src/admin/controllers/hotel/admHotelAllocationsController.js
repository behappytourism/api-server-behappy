const { isValidObjectId } = require("mongoose");
const { sendErrorResponse } = require("../../../helpers");

const { Hotel, HotelAllocation, RoomType, HotelContractGroup } = require("../../../models/hotel");
const { getDates } = require("../../../utils");
const {
    hotelAllocationSchema,
    allocationAvailabilitySchema,
} = require("../../validations/hotel/hotelAllocationSchema");

module.exports = {
    upsertHotelAllocation: async (req, res) => {
        try {
            const {
                hotelId,
                fromDate,
                toDate,
                roomTypes,
                contractGroups,
                allocationType,
                releaseDate,
                unitWise,
                allocation,
                rateType,
            } = req.body;

            const { _, error } = hotelAllocationSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(hotelId)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }

            const hotelDetail = await Hotel.findOne({
                _id: hotelId,
                isDeleted: false,
                isPublished: true,
            });
            if (!hotelDetail) {
                return sendErrorResponse(res, 404, "hotel not found");
            }

            // if (
            //     new Date(fromDate) < new Date(new Date().setHours(0, 0, 0, 0)) ||
            //     new Date(fromDate) > new Date(toDate)
            // ) {
            //     return sendErrorResponse(res, 400, "invalid date range.");
            // }

            const dates = getDates(fromDate, toDate);

            const upsertArr = [];
            for (let i = 0; i < roomTypes?.length; i++) {
                for (let k = 0; k < contractGroups?.length; k++) {
                    for (let j = 0; j < dates?.length; j++) {
                        upsertArr.push({
                            updateOne: {
                                filter: {
                                    date: dates[j],
                                    hotel: hotelId,
                                    roomType: roomTypes[i],
                                    contractGroup: contractGroups[k],
                                },
                                update: {
                                    date: dates[j],
                                    hotel: hotelId,
                                    roomType: roomTypes[i],
                                    contractGroup: contractGroups[k],
                                    allocationType,
                                    releaseDate:
                                        allocationType !== "stop-sale" ? releaseDate : null,
                                    unitWise: allocationType === "static" ? unitWise : null,
                                    allocation: allocationType === "static" ? allocation : null,
                                    ...(rateType !== "default" && { rateType }),
                                },
                                upsert: true,
                            },
                        });
                    }
                }
            }

            await HotelAllocation.bulkWrite([...upsertArr]);

            res.status(200).json({ message: "hotel allocation updated successfully" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllocationAvailabilityChart: async (req, res) => {
        try {
            const { fromDate, toDate, hotelId, contractGroups } = req.body;

            const { _, error } = allocationAvailabilitySchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(hotelId)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }

            const hotelDetail = await Hotel.findOne({
                _id: hotelId,
                isDeleted: false,
                isPublished: true,
            })
                .populate("country", "countryName")
                .populate("state", "stateName")
                .populate("city", "cityName")
                .populate("area", "areaName")
                .select("hotelName address city starCategory")
                .lean();
            if (!hotelDetail) {
                return sendErrorResponse(res, 404, "hotel not found");
            }

            const contractGroupsDetail = await HotelContractGroup.find({
                _id: contractGroups,
                hotel: hotelId,
            }).lean();

            const roomTypes = await RoomType.find({
                hotel: hotelId,
                isDeleted: false,
                "roomOccupancies.0": { $exists: true },
            }).lean();

            if (new Date(fromDate) > new Date(toDate)) {
                return sendErrorResponse(res, 400, "invalid date range.");
            }

            const dates = getDates(fromDate, toDate);

            const allocationsChart = [];
            for (let h = 0; h < contractGroupsDetail?.length; h++) {
                const roomTypeAllocations = [];
                for (let i = 0; i < roomTypes?.length; i++) {
                    const allocations = [];
                    const allAllocations = await HotelAllocation.find({
                        date: { $lte: new Date(toDate) },
                        date: { $gte: new Date(fromDate) },
                        roomType: roomTypes[i]?._id,
                        contractGroup: contractGroupsDetail[h],
                    })
                        .sort({ date: -1 })
                        .lean();

                    for (let j = 0; j < dates?.length; j++) {
                        const objIndex = allAllocations?.findIndex((item) => {
                            return item?.date?.toISOString().substring(0, 10) === dates[j];
                        });
                        if (objIndex === -1) {
                            allocations.push({
                                hotel: hotelId,
                                roomType: roomTypes[i]?._id,
                                date: dates[j],
                                allocationType: "none",
                                rateType: "all-promotions",
                            });
                        } else {
                            allocations.push(allAllocations[objIndex]);
                        }
                    }

                    roomTypeAllocations.push({
                        roomType: roomTypes[i]?._id,
                        roomTypeName: roomTypes[i]?.roomName,
                        allocations,
                    });
                }
                allocationsChart.push({
                    contractName: contractGroupsDetail[h]?.contractName,
                    contractCode: contractGroupsDetail[h]?.contractCode,
                    roomTypes: roomTypeAllocations,
                });
            }

            res.status(200).json({ hotel: hotelDetail, contractGroups: allocationsChart, dates });
        } catch (err) {
            sendErrorResponse(res, 400, err);
        }
    },
};
