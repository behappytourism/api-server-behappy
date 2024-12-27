const { isValidObjectId, Types } = require("mongoose");
const xl = require("excel4node");

const { sendErrorResponse } = require("../../../helpers");
const {
    Hotel,
    HotelContract,
    HotelBoardType,
    HotelContractGroup,
    HotelPromotion,
} = require("../../../models/hotel");
const { checkDateDefaultValidations } = require("../../helpers/hotel/hotelContractHelpers");
const {
    hotelContractSchema,
    hotelContractCloneSchema,
    hotelContractGroupChangeSchema,
} = require("../../validations/hotel/hotelContract.schema");
const { formatDate } = require("../../../utils");

module.exports = {
    addNewContract: async (req, res) => {
        try {
            const {
                contractGroup,
                basePlan,
                sellFrom,
                sellTo,
                roomRates,
                mealSupplements,
                extraSupplements,
                childPolicies,
                cancellationPolicies,
                isSpecialRate,
                parentContract,
                bookingWindowFrom,
                bookingWindowTo,
                isActive,
                specificNations,
                applicableNations,
            } = req.body;

            const { _, error } = hotelContractSchema.validate({
                ...req.body,
            });
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(contractGroup)) {
                return sendErrorResponse(res, 400, "invalid contract group id");
            }
            const contractGroupDetail = await HotelContractGroup.findOne({
                _id: contractGroup,
            }).lean();
            if (!contractGroupDetail) {
                return sendErrorResponse(res, 404, "contract group not found");
            }

            if (!isValidObjectId(basePlan)) {
                return sendErrorResponse(res, 400, "invalid base plan");
            }

            const basePlanDetail = await HotelBoardType.findOne({
                _id: basePlan,
                hotel: contractGroupDetail.hotel,
                isDeleted: false,
            });
            if (!basePlanDetail) {
                return sendErrorResponse(res, 404, "base plan not found");
            }

            if (new Date(sellFrom) > new Date(sellTo)) {
                return sendErrorResponse(res, 400, "please enter valid sellFrom and sellTo date.");
            }

            if (roomRates && roomRates?.length > 0) {
                for (let i = 0; i < roomRates?.length; i++) {
                    if (
                        new Date(roomRates[i].fromDate) > new Date(roomRates[i].toDate) ||
                        new Date(roomRates[i].fromDate) < new Date(sellFrom) ||
                        new Date(roomRates[i].toDate) > new Date(sellTo)
                    ) {
                        return sendErrorResponse(
                            res,
                            400,
                            "hotel room rates should be between contract's validity, toDate should be greater than or equal to fromDate"
                        );
                    }

                    if (isSpecialRate === true && !roomRates[i]?.rateCode) {
                        return sendErrorResponse(
                            res,
                            400,
                            `'roomRates[${i}].rateCode' is required`
                        );
                    }
                    if (isSpecialRate === false && roomRates[i]?.rateCode) {
                        delete roomRates[i].rateCode;
                    }
                }
            }

            if (mealSupplements && mealSupplements?.length > 0) {
                const mealSupplementDateRangeValidation = checkDateDefaultValidations(
                    mealSupplements,
                    sellFrom,
                    sellTo
                );
                if (mealSupplementDateRangeValidation === false) {
                    return sendErrorResponse(
                        res,
                        400,
                        "meal supplements should be between contract's validity, toDate should be greater than or equal to fromDate"
                    );
                }

                for (let i = 0; i < mealSupplements?.length; i++) {
                    const mealSupplement = await HotelBoardType.findOne({
                        _id: mealSupplements[i]?.boardType,
                        hotel: contractGroupDetail.hotel,
                        isDeleted: false,
                    });
                    if (!mealSupplement || mealSupplement.isRoomOnly === true) {
                        return sendErrorResponse(
                            res,
                            400,
                            "please select non room only board in meal supplement"
                        );
                    }
                }
            }

            if (extraSupplements && extraSupplements?.length > 0) {
                const extraSupplementDateRangeValidation = checkDateDefaultValidations(
                    extraSupplements,
                    sellFrom,
                    sellTo
                );
                if (extraSupplementDateRangeValidation === false) {
                    return sendErrorResponse(
                        res,
                        400,
                        "extra supplements should be between contract's validity, toDate should be greater than or equal to fromDate"
                    );
                }
            }

            if (childPolicies && childPolicies?.length > 0) {
                const childPoliciesDateRangeValidation = checkDateDefaultValidations(
                    childPolicies,
                    sellFrom,
                    sellTo
                );
                if (childPoliciesDateRangeValidation === false) {
                    return sendErrorResponse(
                        res,
                        400,
                        "child policies should be between contract's validity, toDate should be greater than or equal to fromDate"
                    );
                }
            }

            if (cancellationPolicies && cancellationPolicies?.length > 0) {
                const cancellationPoliciesDateRangeValidation = checkDateDefaultValidations(
                    cancellationPolicies,
                    sellFrom,
                    sellTo
                );
                if (cancellationPoliciesDateRangeValidation === false) {
                    return sendErrorResponse(
                        res,
                        400,
                        "cancellation policies should be between contract's validity, toDate should be greater than or equal to fromDate"
                    );
                }

                for (let policy of cancellationPolicies) {
                    if (
                        policy?.daysBefore &&
                        policy?.daysBefore >= policy?.requestCancelDaysBefore
                    ) {
                        return sendErrorResponse(
                            res,
                            400,
                            "Cancel Booking Before should be less than days before"
                        );
                    }
                }
            }

            const newContract = new HotelContract({
                ...req.body,
                applicableNations: specificNations === true ? applicableNations : [],
                hotel: contractGroupDetail?.hotel,
                status: isActive === true ? "pending-approval" : "inactive",
                parentContract: isSpecialRate === true ? parentContract : null,
                bookingWindowFrom: isSpecialRate === true ? bookingWindowFrom : null,
                bookingWindowTo: isSpecialRate === true ? bookingWindowTo : null,
            });
            await newContract.save();

            res.status(200).json(newContract);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateContract: async (req, res) => {
        try {
            const { id } = req.params;
            const {
                contractGroup,
                basePlan,
                sellFrom,
                sellTo,
                roomRates,
                mealSupplements,
                extraSupplements,
                childPolicies,
                cancellationPolicies,
                isSpecialRate,
                parentContract,
                bookingWindowFrom,
                bookingWindowTo,
                isActive,
                specificNations,
                applicableNations,
            } = req.body;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid contrac id");
            }

            const { _, error } = hotelContractSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(contractGroup)) {
                return sendErrorResponse(res, 400, "invalid contract group id");
            }
            const contractGroupDetail = await HotelContractGroup.findOne({
                _id: contractGroup,
            });
            if (!contractGroupDetail) {
                return sendErrorResponse(res, 404, "contract group not found");
            }

            if (!isValidObjectId(basePlan)) {
                return sendErrorResponse(res, 400, "invalid base plan");
            }

            const basePlanDetail = await HotelBoardType.findOne({
                _id: basePlan,
                hotel: contractGroupDetail?.hotel,
            });
            if (!basePlanDetail) {
                return sendErrorResponse(res, 404, "base plan not found");
            }

            if (new Date(sellFrom) > new Date(sellTo)) {
                return sendErrorResponse(res, 400, "please enter valid sellFrom and sellTo date.");
            }

            if (roomRates && roomRates?.length > 0) {
                for (let i = 0; i < roomRates?.length; i++) {
                    if (
                        new Date(roomRates[i].fromDate) > new Date(roomRates[i].toDate) ||
                        new Date(roomRates[i].fromDate) < new Date(sellFrom) ||
                        new Date(roomRates[i].toDate) > new Date(sellTo)
                    ) {
                        return sendErrorResponse(
                            res,
                            400,
                            "hotel room rates should be between contract's validity, toDate should be greater than or equal to fromDate"
                        );
                    }

                    // if (isSpecialRate === true && !roomRates[i]?.rateCode) {
                    //     return sendErrorResponse(
                    //         res,
                    //         400,
                    //         `'roomRates[${i}].rateCode' is required`
                    //     );
                    // }
                    if (isSpecialRate === false && roomRates[i]?.rateCode) {
                        delete roomRates[i].rateCode;
                    }
                }
            }

            if (mealSupplements && mealSupplements?.length > 0) {
                const mealSupplementDateRangeValidation = checkDateDefaultValidations(
                    mealSupplements,
                    sellFrom,
                    sellTo
                );
                if (mealSupplementDateRangeValidation === false) {
                    return sendErrorResponse(
                        res,
                        400,
                        "meal supplements should be between contract's validity, toDate should be greater than or equal to fromDate"
                    );
                }

                for (let i = 0; i < mealSupplements?.length; i++) {
                    const mealSupplement = await HotelBoardType.findOne({
                        _id: mealSupplements[i]?.boardType,
                        hotel: contractGroupDetail?.hotel,
                        isDeleted: false,
                    });
                    if (!mealSupplement || mealSupplement.isRoomOnly === true) {
                        return sendErrorResponse(
                            res,
                            400,
                            "please select non room only board in meal supplement"
                        );
                    }
                }
            }

            if (extraSupplements && extraSupplements?.length > 0) {
                const extraSupplementDateRangeValidation = checkDateDefaultValidations(
                    extraSupplements,
                    sellFrom,
                    sellTo
                );
                if (extraSupplementDateRangeValidation === false) {
                    return sendErrorResponse(
                        res,
                        400,
                        "extra supplements should be between contract's validity, toDate should be greater than or equal to fromDate"
                    );
                }
            }

            if (childPolicies && childPolicies?.length > 0) {
                const childPoliciesDateRangeValidation = checkDateDefaultValidations(
                    childPolicies,
                    sellFrom,
                    sellTo
                );
                if (childPoliciesDateRangeValidation === false) {
                    return sendErrorResponse(
                        res,
                        400,
                        "child policies should be between contract's validity, toDate should be greater than or equal to fromDate"
                    );
                }
            }

            if (cancellationPolicies && cancellationPolicies?.length > 0) {
                const cancellationPoliciesDateRangeValidation = checkDateDefaultValidations(
                    cancellationPolicies,
                    sellFrom,
                    sellTo
                );
                if (cancellationPoliciesDateRangeValidation === false) {
                    return sendErrorResponse(
                        res,
                        400,
                        "cancellation policies should be between contract's validity, toDate should be greater than or equal to fromDate"
                    );
                }

                for (let policy of cancellationPolicies) {
                    if (
                        policy?.daysBefore &&
                        policy?.daysBefore >= policy?.requestCancelDaysBefore
                    ) {
                        return sendErrorResponse(
                            res,
                            400,
                            "Cancel Booking Before should be less than days before"
                        );
                    }
                }
            }

            const contract = await HotelContract.findOneAndUpdate(
                { _id: id, isDeleted: false },
                {
                    ...req.body,
                    applicableNations: specificNations === true ? applicableNations : [],
                    hotel: contractGroupDetail?.hotel,
                    status: isActive === true ? "pending-approval" : "inactive",
                    parentContract: isSpecialRate === true ? parentContract : null,
                    bookingWindowFrom: isSpecialRate === true ? bookingWindowFrom : null,
                    bookingWindowTo: isSpecialRate === true ? bookingWindowTo : null,
                },
                { runValidators: true, new: true }
            );

            res.status(200).json(contract);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteContract: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid contract id");
            }

            const contract = await HotelContract.findOneAndUpdate(
                {
                    _id: id,
                    isDeleted: false,
                },
                { isDeleted: true }
            );
            if (!contract) {
                return sendErrorResponse(res, 404, "contract not found");
            }

            res.status(200).json({
                message: "contract successfully deleted",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleHotelContracts: async (req, res) => {
        try {
            const { hotelId } = req.params;
            const { skip = 0, limit = 10, searchQuery } = req.query;

            const filters = { hotel: Types.ObjectId(hotelId), isDeleted: false };
            if (searchQuery && searchQuery !== "") {
                filters.$or = [
                    { rateCode: { $regex: searchQuery, $options: "i" } },
                    { rateName: { $regex: searchQuery, $options: "i" } },
                ];
            }

            if (!isValidObjectId(hotelId)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }
            const hotel = await Hotel.findOne({
                _id: hotelId,
                isDeleted: false,
            });
            if (!hotel) {
                return sendErrorResponse(res, 404, "hotel not found");
            }

            const contracts = await HotelContract.find(filters)
                .populate("basePlan")
                .populate("contractGroup")
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalContracts = await HotelContract.find(filters).count();

            res.status(200).json({
                contracts,
                skip: Number(skip),
                limit: Number(limit),
                totalContracts,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleContract: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid contracts id");
            }

            const contract = await HotelContract.findById(id);

            if (!contract) {
                return sendErrorResponse(res, 404, "contracts not found");
            }

            res.status(200).json(contract);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    cloneExistingContract: async (req, res) => {
        try {
            const { contractId } = req.params;
            const { rateName, rateCode, priority } = req.body;

            const { _, error } = hotelContractCloneSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(contractId)) {
                return sendErrorResponse(res, 400, "invalid contract id");
            }
            const contract = await HotelContract.findOne({ _id: contractId })
                .populate("basePlan")
                .lean();
            if (!contract) {
                return sendErrorResponse(res, 404, "contract not found");
            }

            const newContract = new HotelContract({
                ...contract,
                _id: undefined,
                createdAt: undefined,
                updatedAt: undefined,
                rateName,
                rateCode,
                priority,
                status: "inactive",
                specificNations: contract?.specificNations || false,
            });
            await newContract.save();

            // if (isExistingPromotion === true) {
            //     await HotelPromotion.updateMany(
            //         { contractGroups: contract?.contractGroup },
            //         {
            //             $push: { contractGroups:  },
            //         }
            //     );
            // }

            let tempContract = JSON.parse(JSON.stringify(newContract));
            tempContract.basePlan = contract.basePlan;

            res.status(200).json(tempContract);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    approveHotelContract: async (req, res) => {
        try {
            const { id } = req.params;
            const { isApproved } = req.body;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid hotel contract id");
            }

            const hotelContract = await HotelContract.findOneAndUpdate(
                { _id: id, isDeleted: false },
                { status: isApproved === true ? "approved" : "not-approved" },
                { new: true }
            );
            if (!hotelContract) {
                return sendErrorResponse(res, 404, "hotel contract not found");
            }

            res.status(200).json({
                message: `contract ${
                    isApproved === true ? "approved" : "not approved"
                } successfully `,
                _id: id,
                status: hotelContract?.status,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleContractGroupsContracts: async (req, res) => {
        try {
            const { contractGroupId } = req.params;
            const { skip = 0, limit = 10, searchQuery } = req.query;

            const filters = { contractGroup: Types.ObjectId(contractGroupId), isDeleted: false };
            if (searchQuery && searchQuery !== "") {
                filters.$or = [
                    { rateCode: { $regex: searchQuery, $options: "i" } },
                    { rateName: { $regex: searchQuery, $options: "i" } },
                ];
            }

            if (!isValidObjectId(contractGroupId)) {
                return sendErrorResponse(res, 400, "invalid contract group id");
            }
            const contractGroup = await HotelContractGroup.findOne({
                _id: contractGroupId,
            });
            if (!contractGroup) {
                return sendErrorResponse(res, 404, "contract group not found");
            }

            const contracts = await HotelContract.find(filters)
                .populate("basePlan")
                .sort({ createdAt: -1 })
                .limit(limit)
                .skip(limit * skip)
                .lean();

            const totalContracts = await HotelContract.find(filters).count();

            res.status(200).json({
                totalContracts,
                skip: Number(skip),
                limit: Number(limit),
                contractGroup,
                contracts,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    changeHotelContractGroup: async (req, res) => {
        try {
            const { contract, contractGroup } = req.body;

            const { _, error } = hotelContractGroupChangeSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(contract)) {
                return sendErrorResponse(res, 400, "invalid contract id");
            }
            const contractDetail = await HotelContract.findOne({ _id: contract, isDeleted: false });
            if (!contractDetail) {
                return sendErrorResponse(res, 404, "contract not found");
            }

            if (!isValidObjectId(contractGroup)) {
                return sendErrorResponse(res, 400, "invalid contract group id");
            }
            const contractGroupDetail = await HotelContractGroup.findOne({
                _id: contractGroup,
            });
            if (!contractGroupDetail) {
                return sendErrorResponse(res, 404, "contract group not found");
            }

            // contractDetail.contractGroup = contractGroup;
            await contractDetail.updateOne({ contractGroup });

            res.status(200).json({
                message: "contract group successfully updated",
                contractId: contract,
                contractGroup: contractGroupDetail,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    downloadHotelContractsAsXlsx: async (req, res) => {
        try {
            const { hotelId } = req.params;

            if (!isValidObjectId(hotelId)) {
                return sendErrorResponse(res, 400, "invalid hotel id");
            }
            const hotel = await Hotel.findOne({ _id: hotelId, isDeleted: false })
                .select("hotelName address")
                .lean();
            if (!hotel) {
                return sendErrorResponse(res, 404, "hotel not found");
            }

            const contracts = await HotelContract.find({ hotel: hotelId, isDeleted: false })
                .populate("contractGroup", "contractName contractCode")
                .populate("basePlan")
                .select(
                    "rateCode rateName contractGroup status priority sellFrom sellTo basePlan isSpecialRate"
                )
                .lean();

            const promotions = await HotelPromotion.find({
                hotel: hotelId,
                isDeleted: false,
            })
                .populate("contractGroups", "contractName contractCode")
                .select(
                    "promotionCode name sellFrom sellTo bookingWindowFrom bookingWindowTo isActive priority contractGroups"
                )
                .lean();

            const wb = new xl.Workbook();
            const ws1 = wb.addWorksheet("contracts");
            const ws2 = wb.addWorksheet("promotions");

            const titleStyle = wb.createStyle({
                font: {
                    bold: true,
                },
            });

            ws1.cell(1, 1).string("Rate Code").style(titleStyle);
            ws1.cell(1, 2).string("Rate Name").style(titleStyle);
            ws1.cell(1, 3).string("Base Plan").style(titleStyle);
            ws1.cell(1, 4).string("Sell From").style(titleStyle);
            ws1.cell(1, 5).string("Sell To").style(titleStyle);
            ws1.cell(1, 6).string("Contract Group").style(titleStyle);
            ws1.cell(1, 7).string("Contract Type").style(titleStyle);
            ws1.cell(1, 8).string("Priority").style(titleStyle);
            ws1.cell(1, 9).string("Status").style(titleStyle);

            for (let i = 0; i < contracts?.length; i++) {
                const contract = contracts[i];

                ws1.cell(i + 2, 1).string(contract?.rateCode || "");
                ws1.cell(i + 2, 2).string(contract?.rateName || "");
                ws1.cell(i + 2, 3).string(contract?.basePlan?.boardName || "");
                ws1.cell(i + 2, 4).string(
                    contract?.sellFrom ? formatDate(contract?.sellFrom) : "N/A"
                );
                ws1.cell(i + 2, 5).string(contract?.sellTo ? formatDate(contract?.sellTo) : "N/A");
                ws1.cell(i + 2, 6).string(
                    `${contract?.contractGroup?.contractName} (${contract?.contractGroup?.contractCode})`
                );
                ws1.cell(i + 2, 7).string(
                    contract?.isSpecialRate === true ? "Promotional Contract" : "Contract"
                );
                ws1.cell(i + 2, 8).number(contract?.priority || 0);
                ws1.cell(i + 2, 9).string(contract?.status || "");
            }

            ws2.cell(1, 1).string("Promotion Code").style(titleStyle);
            ws2.cell(1, 2).string("Promotion Name").style(titleStyle);
            ws2.cell(1, 3).string("Sell From").style(titleStyle);
            ws2.cell(1, 4).string("Sell To").style(titleStyle);
            ws2.cell(1, 5).string("Booking Window From").style(titleStyle);
            ws2.cell(1, 6).string("Booking Window To").style(titleStyle);
            ws2.cell(1, 7).string("Contract Group").style(titleStyle);
            ws2.cell(1, 8).string("Priority").style(titleStyle);
            ws2.cell(1, 9).string("Status").style(titleStyle);

            for (let i = 0; i < promotions?.length; i++) {
                const promotion = promotions[i];

                let contractGroupsStr = "";
                promotion?.contractGroups?.map((item, index) => {
                    if (index !== 0) {
                        contractGroupsStr += `, ${item?.contractName} (${item?.contractCode})`;
                    } else {
                        contractGroupsStr += `${item?.contractName} (${item?.contractCode})`;
                    }
                });

                ws2.cell(i + 2, 1).string(promotion?.promotionCode || "");
                ws2.cell(i + 2, 2).string(promotion?.name || "");
                ws2.cell(i + 2, 3).string(
                    promotion?.sellFrom ? formatDate(promotion?.sellFrom) : "N/A"
                );
                ws2.cell(i + 2, 4).string(
                    promotion?.sellTo ? formatDate(promotion?.sellTo) : "N/A"
                );
                ws2.cell(i + 2, 5).string(
                    promotion?.bookingWindowFrom ? formatDate(promotion?.bookingWindowFrom) : "N/A"
                );
                ws2.cell(i + 2, 6).string(
                    promotion?.bookingWindowTo ? formatDate(promotion?.bookingWindowTo) : "N/A"
                );
                ws2.cell(i + 2, 7).string(contractGroupsStr);
                ws2.cell(i + 2, 8).number(promotion?.priority || 0);
                ws2.cell(i + 2, 9).string(promotion?.isActive === true ? "Active" : "Inactive");
            }

            wb.write(`${hotel?.hotelName}.xlsx`, res);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
