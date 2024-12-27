const { isValidObjectId } = require("mongoose");

const { sendErrorResponse, createQuotationPdf } = require("../../../helpers");
const { AttractionTicketSetting } = require("../../../models");

module.exports = {
    addNewTicketSample: async (req, res) => {
        try {
            const { name } = req.body;

            if (!req.file?.path) {
                return sendErrorResponse(res, 400, "image is required");
            }

            let image;
            if (req.file?.path) {
                image = "/" + req.file.path.replace(/\\/g, "/");
            }

            const ticketSettings = await AttractionTicketSetting.findOneAndUpdate(
                {},
                {
                    $push: {
                        samples: {
                            name: name,
                            image: image,
                        },
                    },
                },
                { new: true, upsert: true }
            );

            res.status(200).json(ticketSettings);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    listAllTickets: async (req, res) => {
        try {
            const ticketSettings = await AttractionTicketSetting.findOne({});

            res.status(200).json(ticketSettings);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    changeTicketStatus: async (req, res) => {
        try {
            const { name } = req.params;

            const ticketSettings = await AttractionTicketSetting.findOne({
                sampleArray: { $elemMatch: { name: name } },
            });

            if (!ticketSettings) {
                return sendErrorResponse(res, 400, "theme not found");
            }
            ticketSettings.selected = name;

            await ticketSettings.save();
            res.status(200).json(ticketSettings);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
