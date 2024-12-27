const { Schema, model } = require("mongoose");

const airportSchema = new Schema(
    {
        airportName: {
            type: String,
            required: true,
        },
        icaoCode: {
            type: String,
            required: true,
            uppercase: true,
        },
        iataCode: {
            type: String,
            required: true,
            uppercase: true,
            unique: true,
        },
        country: {
            type: Schema.Types.ObjectId,
            ref: "Country",
            required: true,
        },
        place: {
            type: String,
            required: true,
        },
        latitude: {
            type: String,
            required: true,
        },
        longitude: {
            type: String,
            required: true,
        },
        isDeleted: {
            type: Boolean,
            required: true,
        },
        isActive: {
            type: Boolean,
            required: true,
        },
        access: {
            type: [String],
            enum: ["quotation", "a2a", "flight", "attraction"],
            lowercase: true,
        },

        terminals: {
            type: [
                {
                    terminalName: {
                        type: String,
                        required: true,
                    },
                    terminalCode: {
                        type: String,
                        unique: true,
                        required: true,
                        uppercase: true,
                    },
                    access: {
                        type: [String],
                        enum: ["quotation", "a2a", "flight", "attraction"],
                        lowercase: true,
                    },
                },
            ],
        },
    },
    { timestamps: true }
);

const Airport = model("Airport", airportSchema);

module.exports = Airport;
