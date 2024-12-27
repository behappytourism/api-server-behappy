const { Schema, model } = require("mongoose");

const hotelContactSchema = new Schema(
    {
        hotel: {
            type: Schema.Types.ObjectId,
            ref: "Hotel",
            required: true,
        },
        hotelContacts: {
            type: [
                {
                    name: {
                        type: String,
                        required: true,
                    },
                    position: {
                        type: String,
                        required: true,
                    },
                    email: {
                        type: String,
                        required: true,
                    },
                    country: {
                        type: Schema.Types.ObjectId,
                        ref: "Country",
                        required: true,
                    },
                    phoneNumber: {
                        type: String,
                        required: true,
                    },
                },
            ],
        },
        reservationsContacts: {
            type: [
                {
                    name: {
                        type: String,
                        required: true,
                    },
                    position: {
                        type: String,
                        required: true,
                    },
                    email: {
                        type: String,
                        required: true,
                    },
                    country: {
                        type: Schema.Types.ObjectId,
                        ref: "Country",
                        required: true,
                    },
                    phoneNumber: {
                        type: String,
                        required: true,
                    },
                },
            ],
        },
        salesContacts: {
            type: [
                {
                    name: {
                        type: String,
                        required: true,
                    },
                    position: {
                        type: String,
                        required: true,
                    },
                    email: {
                        type: String,
                        required: true,
                    },
                    country: {
                        type: Schema.Types.ObjectId,
                        ref: "Country",
                        required: true,
                    },
                    phoneNumber: {
                        type: String,
                        required: true,
                    },
                },
            ],
        },
        accountsContacts: {
            type: [
                {
                    name: {
                        type: String,
                        required: true,
                    },
                    position: {
                        type: String,
                        required: true,
                    },
                    email: {
                        type: String,
                        required: true,
                    },
                    country: {
                        type: Schema.Types.ObjectId,
                        ref: "Country",
                        required: true,
                    },
                    phoneNumber: {
                        type: String,
                        required: true,
                    },
                },
            ],
        },
        // managementsContacts: {
        //     type: [
        //         {
        //             name: {
        //                 type: String,
        //                 required: true,
        //             },
        //             position: {
        //                 type: String,
        //                 required: true,
        //             },
        //             email: {
        //                 type: String,
        //                 required: true,
        //             },
        //             country: {
        //                 type: Schema.Types.ObjectId,
        //                 ref: "Country",
        //                 required: true,
        //             },
        //             phoneNumber: {
        //                 type: String,
        //                 required: true,
        //             },
        //         },
        //     ],
        // },
    },
    { timestamps: true }
);

const HotelContact = model("HotelContact", hotelContactSchema);

module.exports = HotelContact;
