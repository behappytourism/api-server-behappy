const { Currency } = require("../../models");

// TODO
// 1. Add cache here
module.exports = {
    convertCurrency: async (amount, isocode) => {
        try {
            // const currency = await Currency.findOne({ isocode }).cache();
            // if (!currency) {
            //     throw new Error("currency not found");
            // }

            if (Number(amount) < 0) {
                throw new Error("invalid amount");
            }

            // const convertedAmount = Number((amount * currency?.conversionRate).toFixed(2));
            const convertedAmount = Number((amount * 4.04).toFixed(2));
            return convertedAmount;
        } catch (err) {
            throw err;
        }
    },

    razorPayConverter: async (amount, country) => {
        try {
            const currency = await Currency.findOne({ country });
            if (!currency) {
                return new Error("currency not found");
            }

            if (Number(amount) < 0) {
                return new Error("invalid amount");
            }

            const convertedAmount = (amount / currency?.conversionRate).toFixed(2);
            return convertedAmount;
        } catch (err) {
            throw err;
        }
    },

    convertCurrencyUSD: async (amount, isocode) => {
        try {
            const currency = await Currency.findOne({ isocode }).cache();
            if (!currency) {
                throw new Error("currency not found");
            }

            if (Number(amount) < 0) {
                throw new Error("invalid amount");
            }

            const convertedAmount = Number((amount * currency?.conversionRate).toFixed(2));

            return convertedAmount;
        } catch (err) {
            throw err;
        }
    },
};
