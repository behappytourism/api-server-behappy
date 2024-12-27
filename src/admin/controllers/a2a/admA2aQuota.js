const { isValidObjectId, Types } = require("mongoose");
const { B2BA2aTicket, Reseller } = require("../../../b2b/models");
const B2BA2aQuota = require("../../../b2b/models/a2a/b2bA2aQuota.model");
const { sendErrorResponse } = require("../../../helpers");
const { addA2aQuotaSchema } = require("../../validations/admA2aQuota.schema");

module.exports = {
    addA2aQuota: async (req, res) => {
        try {
            const { ticketId } = req.params;

            const { resellerId, ticketCount } = req.body;

            if (!isValidObjectId(ticketId)) {
                return sendErrorResponse(res, 400, "Invalid a2aTicket id");
            }

            if (!isValidObjectId(resellerId)) {
                return sendErrorResponse(res, 400, "Invalid reseller id");
            }

            const { _, error } = addA2aQuotaSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const a2aTicket = await B2BA2aTicket.findOne({
                _id: ticketId,
                isDeleted: false,
            });

            if (!a2aTicket) {
                return sendErrorResponse(res, 404, "A2a Ticket not found");
            }

            const b2bA2aQuota = await B2BA2aQuota.findOne({
                ticketId,
                resellerId,
                isDeleted: false,
            });

            if (b2bA2aQuota) {
                a2aTicket.availableSeats += Number(b2bA2aQuota.ticketCountTotal);
                a2aTicket.availableSeats -= Number(ticketCount);

                b2bA2aQuota.ticketCountTotal = ticketCount;
                b2bA2aQuota.isActive = true;

                await b2bA2aQuota.save();
            } else {
                const newB2BA2aQuota = new B2BA2aQuota({
                    ticketId,
                    resellerId,
                    ticketCountTotal: ticketCount,
                    isDeleted: false,
                    isActive: true,
                });

                await newB2BA2aQuota.save();
                a2aTicket.availableSeats -= Number(ticketCount);
            }

            await a2aTicket.save();

            // const b2bA2aQuota = await B2BA2aQuota.findOneAndUpdate(
            //     {
            //         ticketId,
            //         resellerId,
            //     },
            //     {
            //         ticketId,
            //         resellerId,
            //         ticketCountTotal: ticketCount,
            //     },
            //     { upsert: true, new: true, runValidators: true }
            // );

            res.status(200).json({ message: "successfuly updated seats" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    removeA2aQuota: async (req, res) => {
        try {
            const { ticketId, resellerId } = req.params;

            if (!isValidObjectId(ticketId)) {
                return sendErrorResponse(res, 400, "Invalid a2aTicket id");
            }

            if (!isValidObjectId(resellerId)) {
                return sendErrorResponse(res, 400, "Invalid reseller id");
            }

            const a2aTicket = await B2BA2aTicket.findOne({
                _id: ticketId,
                isDeleted: false,
            });

            if (!a2aTicket) {
                return sendErrorResponse(res, 404, "A2a Ticket not found");
            }

            const b2bA2aQuota = await B2BA2aQuota.findOne({
                ticketId,
                resellerId,
                isDeleted: false,
            });

            if (!b2bA2aQuota) {
                return sendErrorResponse(res, 404, "A2aQuota not found");
            }

            a2aTicket.availableSeats += Number(
                b2bA2aQuota.ticketCountTotal - b2bA2aQuota.ticketCountUsed
            );

            b2bA2aQuota.ticketCountTotal = b2bA2aQuota.ticketCountUsed;
            b2bA2aQuota.isActive = false;

            await b2bA2aQuota.save();
            await a2aTicket.save();

            res.status(200).json({ message: "successfuly deleted" });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    listA2aQuota: async (req, res) => {
        try {
            const { ticketId } = req.params;

            const { skip = 0, limit = 10, companyName } = req.query;

            const filters = { role: "reseller" };

            // if (status && status !== "") {
            //     filters.status = status;
            // }

            if (companyName && companyName !== "") {
                filters.companyName = {
                    $regex: companyName,
                    $options: "i",
                };
            }

            if (!isValidObjectId(ticketId)) {
                return sendErrorResponse(res, 400, "Invalid a2aTicket id");
            }

            const ticket = await B2BA2aTicket.findById(ticketId);

            if (!ticket) {
                return sendErrorResponse(res, 404, "A2a Ticket not found");
            }

            console.log(ticketId, "ticketId");

            const listQuota = await Reseller.aggregate([
                {
                    $match: {
                        status: "ok",
                        ...filters,
                    },
                },
                {
                    $lookup: {
                        from: "countries",
                        localField: "country",
                        foreignField: "_id",
                        as: "country",
                    },
                },

                {
                    $lookup: {
                        from: "b2ba2aquotas",
                        let: { resellerId: "$_id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$ticketId", Types.ObjectId(ticketId)] },
                                            { $eq: ["$resellerId", "$$resellerId"] },
                                        ],
                                    },
                                    isDeleted: false,
                                },
                            },
                        ],
                        as: "quota",
                    },
                },
                {
                    $set: {
                        country: { $arrayElemAt: ["$country", 0] },
                        quota: { $arrayElemAt: ["$quota", 0] },
                    },
                },
                {
                    $group: {
                        _id: null,
                        totalResellers: { $sum: 1 },
                        data: { $push: "$$ROOT" },
                    },
                },
                {
                    $project: {
                        totalResellers: 1,
                        data: {
                            $slice: ["$data", Number(limit) * Number(skip), Number(limit)],
                        },
                    },
                },
            ]);

            if (!listQuota[0]) {
                return sendErrorResponse(res, 404, "A2a Ticket not found");
            }

            console.log(listQuota[0], "listQuota");

            res.status(200).json({
                resellers: listQuota[0].data,
                totalResellers: listQuota[0].totalResellers,
                ticket: ticket,

                skip: Number(skip),
                limit: Number(limit),
            });
        } catch (err) {
            console.log(err, "errmes");
        }
    },
};
