const { model, Schema } = require("mongoose");

const b2cTransferOrderSchema = new Schema(
    {
        user: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        referenceNumber: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        email: {
            type: String,
            required: true,
        },
        phoneNumber: {
            type: String,
            required: true,
        },
        country: {
            type: Schema.Types.ObjectId,
            ref: "Country",
            required: true,
        },

        journey: {
            type: [
                {
                    transferType: {
                        type: String,
                        required: true,
                        lowercase: true,
                        enum: ["oneway", "return"],
                    },
                    noOfAdults: {
                        type: Number,
                        required: true,
                    },
                    noOfChildrens: {
                        type: Number,
                        required: true,
                    },
                    totalPassengers: {
                        type: Number,
                        required: true,
                    },
                    netPrice: {
                        type: Number,
                        required: true,
                    },
                    netCost: {
                        type: Number,
                        required: true,
                    },
                    profit: {
                        type: Number,
                        required: true,
                    },
                    status: {
                        type: String,
                        lowercase: true,
                        enum: ["pending", "booked", "confirmed", "failed", "cancelled"],
                        default: "pending",
                    },
                    note: {
                        type: String,
                    },
                    trips: {
                        type: [
                            {
                                transfer: {
                                    type: String,
                                    required: true,
                                    lowercase: true,
                                    enum: ["airport-group", "group-group", "group-airport"],
                                },
                                suggestionType: {
                                    type: String,
                                    required: true,
                                },
                                transferFrom: {},
                                transferTo: {},
                                pickupDate: {
                                    type: Date,
                                    required: true,
                                },
                                pickupTime: {
                                    type: String,
                                    required: true,
                                },
                                vehicleTypes: {
                                    type: [
                                        {
                                            vehicleId: {
                                                type: Schema.Types.ObjectId,
                                                ref: "VehicleType",
                                                required: true,
                                            },
                                            name: {
                                                type: String,
                                                required: true,
                                            },
                                            price: {
                                                type: Number,
                                                required: true,
                                            },
                                            occupancy: {
                                                type: Number,
                                                required: true,
                                            },
                                            count: {
                                                type: Number,
                                                required: true,
                                            },
                                        },
                                    ],
                                },
                                tripPrice: {
                                    type: Number,
                                    required: true,
                                },
                            },
                        ],
                        required: true,
                    },
                },
            ],
        },
        totalNetFare: {
            type: Number,
            required: true,
        },
        totalNetCost: {
            type: Number,
            required: true,
        },
        totalProfit: {
            type: Number,
            required: true,
            default: 0,
        },
        paymentState: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["non-paid", "partially-paid", "fully-paid"],
        },
        status: {
            type: String,
            required: true,
            lowercase: true,
            enum: ["pending", "completed", "cancelled"],
        },
    },
    { timestamps: true }
);

const B2CTransferOrder = model("B2CTransferOrder", b2cTransferOrderSchema);

module.exports = B2CTransferOrder;
