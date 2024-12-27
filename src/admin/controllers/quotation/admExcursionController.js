const { sendErrorResponse } = require("../../../helpers");
const { ExcursionTicketPricing, ExcursionTransferPricing, Excursion } = require("../../../models");
const { Types } = require("mongoose"); // Import Mongoose if you haven't already

module.exports = {
    addNewExcursion: async (req, res) => {
        try {
            const {
                excursionName,
                description,
                excursionType,
                price1,
                price2,
                price3,
                price4,
                price5,
                price6,
                price7,
                price8,
            } = req.body;

            let transferPricing;
            let ticketPricing;
            if (excursionType?.toLowerCase() === "ticket") {
                ticketPricing = new ExcursionTicketPricing({
                    adultPrice: price1,
                    childPrice: price2,
                    sicWithTicketAdultPrice: price3,
                    sicWithTicketChildPrice: price4,
                    privateTransferSevenSeaterPriceAdult: price5,
                    privateTransferSevenSeaterPriceChild: price6,
                    privateTransferFourteenSeaterPriceAdult: price7,
                    privateTransferFourteenSeaterPriceChild: price8,
                });
                await ticketPricing.save();
            } else if (excursionType?.toLowerCase() === "transfer") {
                transferPricing = new ExcursionTransferPricing({
                    sevenSeaterPrice: price1,
                    fourteenSeaterPrice: price2,
                    sicPrice: price3,
                });
                await transferPricing.save();
            } else {
                return sendErrorResponse(res, 400, "Invalid Excursion Type");
            }

            const newExcursion = new Excursion({
                excursionName,
                excursionType,
                description,
                ticketPricing: ticketPricing?._id,
                transferPricing: transferPricing?._id,
            });

            await newExcursion.save();

            res.status(200).json({
                message: "New Excursion successfully added",
            });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteExcursion: async (req, res) => {
        try {
            const { id } = req.params;

            const excursion = await Excursion.findOneAndDelete({
                _id: id,
            });
            if (!excursion) {
                return sendErrorResponse(res, 404, "Excursion not found");
            }

            res.status(200).json({ message: "Excursion successfully deleted" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getSingleExcursion: async (req, res) => {
        try {
            const { activityId } = req.params;

            const excursion = await Excursion.findOne({ activityId })
                .populate("ticketPricing transferPricing")
                .lean();

            if (!excursion) {
                return sendErrorResponse(res, 404, "Excursion not found");
            }

            console.log(excursion, "excursion");

            res.status(200).json(excursion);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateExcursion: async (req, res) => {
        try {
            const { activityId } = req.params;
            const {
                excursionType,
                ticketPrice,
                sicWithTicket,
                privateTransfer,
                isQuotation,
                isCarousel,
                carouselPosition,
                sicPrice,
            } = req.body;

            const excursion = await Excursion.findOneAndUpdate(
                { activityId },
                {
                    excursionType,
                    isQuotation,
                    isCarousel,
                    carouselPosition,
                    ...(excursionType === "ticket"
                        ? { $unset: { transferPricing: 1 } }
                        : { $unset: { ticketPricing: 1 } }),
                },
                {
                    upsert: true,
                    new: true,
                }
            );

            if (!excursion) {
                return sendErrorResponse(res, 500, "Excursion not found");
            }

            console.log(excursion, "excursion");

            let pricing;
            if (excursionType?.toLowerCase() === "ticket") {
                pricing = await ExcursionTicketPricing.findOneAndUpdate(
                    { _id: excursion?.ticketPricing || Types.ObjectId() },
                    {
                        excursionType,
                        ticketPrice,
                        sicWithTicket,
                        privateTransfer,
                    },
                    {
                        upsert: true,
                        new: true,
                    }
                );

                excursion.ticketPricing = pricing._id;
                await excursion.save();
            } else if (excursionType?.toLowerCase() === "transfer") {
                pricing = await ExcursionTransferPricing.findOneAndUpdate(
                    { _id: excursion?.transferPricing || Types.ObjectId() },
                    {
                        $set: {
                            sicPrice,
                            privateTransfer,
                        },
                    },
                    {
                        new: true,
                        upsert: true,
                    }
                );

                console.log(pricing, "pricing");

                excursion.transferPricing = pricing._id;
                await excursion.save();
            } else {
                return sendErrorResponse(res, 400, "Invalid Excursion Type");
            }

            if (!pricing) {
                return sendErrorResponse(res, 404, "Pricing Info not found!");
            }

            res.status(200).json({ message: "Excursion updated successfully" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllTicketExcursions: async (req, res) => {
        try {
            const tickets = await Excursion.find({ excursionType: "ticket" });
            res.status(200).json(tickets);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
