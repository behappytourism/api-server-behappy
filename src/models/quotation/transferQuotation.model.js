const { Schema, model } = require("mongoose");

const transferQuotationSchema = new Schema(
    {
        stayTransfers: {
            type: [
                {
                    transfers: {
                        type: [
                            {
                                transferId: {
                                    type: Schema.Types.ObjectId,
                                    ref: "Transfer",
                                    required: true,
                                },
                                transferType: {
                                    type: String,
                                    enum: ["airport-city", "city-airport", "city-city"],
                                    lowercase: true,
                                    required: true,
                                },
                                transferFromName: {
                                    type: String,
                                    required: true,
                                },
                                transferFrom: {
                                    type: Schema.Types.ObjectId,
                                    required: true,
                                },
                                transferFromHubName: {
                                    type: String,
                                    required: true,
                                },
                                transferFromId: {
                                    type: String,
                                    // required: true,
                                },
                                transferToName: {
                                    type: String,
                                    required: true,
                                },
                                transferTo: {
                                    type: Schema.Types.ObjectId,
                                    required: true,
                                },
                                transferToHubName: {
                                    type: String,
                                    required: true,
                                },
                                transferToId: {
                                    type: String,
                                    // required: true,
                                },
                                vehicleTypes: {
                                    type: [
                                        {
                                            vehicle: {
                                                type: Schema.Types.ObjectId,
                                                ref: "VehicleType",
                                                required: true,
                                            },
                                            name: {
                                                type: String,
                                                required: true,
                                            },
                                            count: {
                                                type: Number,
                                                required: true,
                                            },
                                            occupancy: {
                                                type: Number,
                                                required: true,
                                            },
                                        },
                                    ],
                                },
                                ppTotalPricePerTransfer: {
                                    type: Number,
                                    required: true,
                                },
                                ppMarketMarkup: {
                                    type: Number,
                                    required: true,
                                },
                                transferCapacity: {
                                    type: Number,
                                    required: true,
                                },
                            },
                        ],
                    },
                    ppTotalPricePerStayTransfer: {
                        type: Number,
                        required: true,
                    },
                    ppTotalMarketMarkupPerStayTransfer: {
                        type: Number,
                        required: true,
                    },
                    ppTotalProfileMarkupPerStayTransfer: {
                        type: Number,
                        required: true,
                    },
                    stayNo: {
                        type: Number,
                        required: true,
                    },
                },
            ],
        },
    },
    { timestamps: true }
);

const TransferQuotation = model("TransferQuotation", transferQuotationSchema);

module.exports = TransferQuotation;
