const { isValidObjectId } = require("mongoose");
const { B2bPromoCode } = require("../../../b2b/models");
const { sendErrorResponse } = require("../../../helpers");
const { B2cPromoCode } = require("../../../models");
const { admPromoCodeSchema } = require("../../validations/global/admPromoCode.schema");

module.exports = {
    addNewPromoCode: async (req, res) => {
        try {
            const {
                product,
                type,
                value,
                isSpecific,
                users,
                isValid,
                fromValidity,
                toValidity,
                minPurchaseValue,
                maxPromoDiscount,
                useagePerPersonCount,
                useageCount,
                code,
                section,
            } = req.body;

            const { _, error } = admPromoCodeSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }
            let newPromoCode;
            if (section === "b2b") {
                newPromoCode = new B2bPromoCode({
                    product,
                    type,
                    value,
                    isSpecific,
                    users,
                    isValid,
                    fromValidity,
                    toValidity,
                    minPurchaseValue,
                    maxPromoDiscount,
                    useageCount,
                    useagePerPersonCount,
                    code,
                });
            } else {
                newPromoCode = new B2cPromoCode({
                    product,
                    type,
                    value,
                    isSpecific,
                    users,
                    isValid,
                    fromValidity,
                    toValidity,
                    minPurchaseValue,
                    maxPromoDiscount,
                    useagePerPersonCount,
                    useageCount,
                    code,
                });
            }

            await newPromoCode.save();
            res.status(200).json(newPromoCode);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllPromoCodes: async (req, res) => {
        try {
            const { section } = req.query;
            let promoCodes;
            if (section === "b2b") {
                promoCodes = await B2bPromoCode.find({ isDeleted: false }).populate("users").sort({
                    createdAt: -1,
                });
            } else {
                promoCodes = await B2cPromoCode.find({ isDeleted: false }).populate("users").sort({
                    createdAt: -1,
                });
            }

            res.status(200).json(promoCodes);
        } catch (err) {
            console.log(err);
            sendErrorResponse(res, 500, err);
        }
    },

    deletePromoCode: async (req, res) => {
        try {
            const { id, section } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid promocode id!");
            }
            let promoCode;

            if (section === "b2b") {
                promoCode = await B2bPromoCode.findByIdAndRemove(id);
            } else {
                promoCode = await B2cPromoCode.findByIdAndRemove(id);
            }

            if (!promoCode) {
                return sendErrorResponse(res, 404, "PromoCode not found!");
            }

            res.status(200).json({
                message: "PromoCode successfully deleted",
                _id: id,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updatePromoCode: async (req, res) => {
        try {
            const { id } = req.params;
            console.log(id);
            const {
                product,
                type,
                value,
                isSpecific,
                users,
                isValid,
                fromValidity,
                toValidity,
                minPurchaseValue,
                maxPromoDiscount,
                useagePerPersonCount,
                useageCount,
                section,
                code,
            } = req.body;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid promoCode id!");
            }
            let promoCode;

            if (section === "b2b") {
                promoCode = await B2bPromoCode.findByIdAndUpdate(
                    id,
                    {
                        product,
                        type,
                        value,
                        isSpecific,
                        users,
                        isValid,
                        fromValidity,
                        toValidity,
                        minPurchaseValue,
                        maxPromoDiscount,
                        useagePerPersonCount,
                        useageCount,
                        code,
                    },
                    { runValidators: true, new: true }
                );
            } else {
                promoCode = await B2cPromoCode.findByIdAndUpdate(
                    id,
                    {
                        product,
                        type,
                        value,
                        isSpecific,
                        users,
                        isValid,
                        fromValidity,
                        toValidity,
                        minPurchaseValue,
                        maxPromoDiscount,
                        useagePerPersonCount,
                        useageCount,
                        code,
                    },
                    { runValidators: true, new: true }
                );
            }

            if (!promoCode) {
                return sendErrorResponse(res, 404, "Promocode not found!");
            }

            res.status(200).json(promoCode);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSinglePromoCode: async (req, res) => {
        try {
            const { id, section } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "Invalid promocode id!");
            }
            let promoCode;

            if (section === "b2b") {
                promoCode = await B2bPromoCode.findById(id);
            } else {
                promoCode = await B2cPromoCode.findById(id);
            }

            if (!promoCode) {
                return sendErrorResponse(res, 404, "PromoCode not found!");
            }

            res.status(200).json({
                promoCode,
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
