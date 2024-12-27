const { isValidObjectId } = require("mongoose");

const { sendErrorResponse } = require("../../../helpers");
const { ContractProvider } = require("../../../models/hotel");
const { contractProviderSchema } = require("../../validations/hotel/contractProvider.schema");

module.exports = {
    addContractProvider: async (req, res) => {
        try {            
            const { _, error } = contractProviderSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const newContractProvider = new ContractProvider({
                ...req.body,
            });
            await newContractProvider.save();

            res.status(200).json(newContractProvider);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    updateContractProvider: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid contract provider id");
            }

            const { _, error } = contractProviderSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 400, error.details[0].message);
            }

            const contractProvider = await ContractProvider.findOneAndUpdate(
                {
                    _id: id,
                    isDeleted: false,
                },
                { ...req.body },
                { runValidators: true, new: true }
            );
            if (!contractProvider) {
                return sendErrorResponse(res, 404, "contract provider not found");
            }

            res.status(200).json(contractProvider);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    deleteContractProvider: async (req, res) => {
        try {
            const { id } = req.params;

            if (!isValidObjectId(id)) {
                return sendErrorResponse(res, 400, "invalid contract provider id");
            }

            const contractProvider = await ContractProvider.findOneAndUpdate(
                { _id: id, isDeleted: false },
                { isDeleted: true }
            );
            if (!contractProvider) {
                return sendErrorResponse(res, 404, "contract provider not found");
            }

            res.status(200).json({ message: "contract provider successfully deleted", _id: id });
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },

    getAllContractProviders: async (req, res) => {
        try {
            const contractProviders = await ContractProvider.find({ isDeleted: false }).sort({
                createdAt: -1,
            });

            res.status(200).json(contractProviders);
        } catch (err) {
            sendErrorResponse(res, 500, err);
        }
    },
};
