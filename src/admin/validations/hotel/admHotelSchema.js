const Joi = require("joi");

const hotelSchema = Joi.object({
    hotelName: Joi.string().required(),
    address: Joi.string().required(),
    landMark: Joi.string().allow("", null),
    street: Joi.string().allow("", null),
    country: Joi.string().required(),
    state: Joi.string().required(),
    city: Joi.string().required(),
    area: Joi.string().allow("", null),
    postalCode: Joi.number().allow("", null),
    hotelChain: Joi.string().allow("", null),
    longitude: Joi.string().required(),
    latitude: Joi.string().required(),
    amenities: Joi.array().items({
        amenity: Joi.string().required(),
        amenityGroup: Joi.string().required(),
        isPaid: Joi.boolean().required(),
        isFeatured: Joi.boolean().required(),
        name: Joi.string().required(),
    }),
    website: Joi.string().allow("", null),
    starCategory: Joi.string().required(),
    roomsCount: Joi.number().allow("", null),
    floorsCount: Joi.number().allow("", null),
    carParkingSlots: Joi.number().allow("", null),
    description: Joi.string().required(),
    faqs: Joi.array().items(
        Joi.object({
            question: Joi.string().required(),
            answer: Joi.string().required(),
            _id: Joi.string().allow("", null),
        })
    ),
    checkInTime: Joi.string().required(),
    checkOutTime: Joi.string().required(),
    distanceFromCity: Joi.number().allow("", null),
    openDays: Joi.array()
        .items(
            Joi.string().valid(
                "sunday",
                "monday",
                "tuesday",
                "wednesday",
                "thursday",
                "friday",
                "saturday"
            )
        )
        .required(),
    isContractAvailable: Joi.boolean().required(),
    boardTypes: Joi.array().items(Joi.string().required()).min(1),
    accommodationType: Joi.string().required(),
    isApiConnected: Joi.boolean().required(),
    connectedApis: Joi.array().items(Joi.string()),
    oldImages: Joi.array(),
    salesContacts: Joi.array().items({
        name: Joi.string().required(),
        position: Joi.string().required(),
        email: Joi.string().required(),
        country: Joi.string().required(),
        phoneNumber: Joi.string().required(),
        _id: Joi.string().allow("", null),
    }),
    accountsContacts: Joi.array().items({
        name: Joi.string().required(),
        position: Joi.string().required(),
        email: Joi.string().required(),
        country: Joi.string().required(),
        phoneNumber: Joi.string().required(),
        _id: Joi.string().allow("", null),
    }),
    hotelContacts: Joi.array().items({
        name: Joi.string().required(),
        position: Joi.string().required(),
        email: Joi.string().required(),
        country: Joi.string().required(),
        phoneNumber: Joi.string().required(),
        _id: Joi.string().allow("", null),
    }),
    reservationsContacts: Joi.array().items({
        name: Joi.string().required(),
        position: Joi.string().required(),
        email: Joi.string().required(),
        country: Joi.string().required(),
        phoneNumber: Joi.string().required(),
        _id: Joi.string().allow("", null),
    }),
    bars: Joi.array().items({
        name: Joi.string().required(),
        barType: Joi.string().required().valid("outdoor", "indoor"),
        fromTime: Joi.string().required(),
        toTime: Joi.string().required(),
        _id: Joi.string().allow("", null),
    }),
    restaurants: Joi.array().items({
        name: Joi.string().required(),
        cuisine: Joi.string().required(),
        fromTime: Joi.string().required(),
        toTime: Joi.string().required(),
        _id: Joi.string().allow("", null),
    }),
    hbId: Joi.number().allow("", null),
    ottilaId: Joi.string().allow("", null),
    isActive: Joi.boolean().required(),
    allGuestDetailsRequired: Joi.boolean().required(),
});

module.exports = { hotelSchema };

// correspondenceAddress: Joi.object({
//     street: Joi.string().required(),
//     address2: Joi.string().allow("", null),
//     address3: Joi.string().allow("", null),
//     country: Joi.string().required(),
//     city: Joi.string().required(),
//     zipcode: Joi.number().allow("", null),
//     phone: Joi.number().allow("", null),
// }),
