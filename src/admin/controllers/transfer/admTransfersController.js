const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { City } = require("../../../models/global");
const { Transfer, VehicleType } = require("../../../models/transfer");
const {
    transferSchema,
} = require("../../validations/transfer/transfer.schema");

module.exports = {
    addNewTransfer: async (req, res) => {
        try {
            const { transferFrom, transferTo, vehicleTypes } = req.body;

            const { _, error } = transferSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            if (!isValidObjectId(transferFrom)) {
                return sendErrorResponse(res, 400, "invalid transfer from");
            }

            const transferFromDetail = await City.findOne({
                _id: transferTo,
            });
            if (!transferFromDetail) {
                return sendErrorResponse(res, 404, "transfer from not found");
            }

            if (!isValidObjectId(transferTo)) {
                return sendErrorResponse(res, 400, "invalid tranfer to");
            }

            const transferToDetail = await City.findOne({
                _id: transferTo,
            });
            if (!transferToDetail) {
                return sendErrorResponse(res, 404, "transfer to not found");
            }

            for (let i = 0; i < vehicleTypes.length; i++) {
                if (!isValidObjectId(vehicleTypes[i])) {
                    return sendErrorResponse(
                        res,
                        400,
                        "invalid vehicle type id"
                    );
                }
                const vehicleTypeDetail = await VehicleType.findOne({
                    _id: vehicleTypes,
                });
                if (!vehicleTypeDetail) {
                    return sendErrorResponse(
                        res,
                        404,
                        "vehicle type not found"
                    );
                }
            }

            const newTransfer = new Transfer({});
            await newTransfer.save();

            res.status(200).json(newTransfer);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateTransfer: async (req, res) => {
        try {
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteTransfer: async (req, res) => {
        try {
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
