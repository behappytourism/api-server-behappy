const { fetchContractDatas, getContractRoomRates } = require("./contractAvailabilityHelper");

const PRICE_TYPE = {
    ALL: "all",
    STATIC: "static",
    DYNAMIC: "dynamic",
};

const getContractHotelRoomRates = async (
    priceType,
    hotel,
    nationality,
    fromDate,
    toDate,
    dates,
    rooms,
    noOfNights,
    totalAdults,
    totalChildren,
    bookBefore,
    clientMarkups,
    clientStarCategoryMarkups,
    subAgentMarkups,
    subAgentStarCategoryMarkups,
    marketStrategy,
    profileMarkup,
    reseller
) => {
    if (priceType !== PRICE_TYPE.DYNAMIC && hotel.isContractAvailable) {
        try {
            const {
                roomTypes,
                boardTypes,
                allContracts,
                allAddOns,
                allPromotions,
                allAllocations,
            } = await fetchContractDatas(hotel, nationality, fromDate, toDate);

            if (
                roomTypes &&
                boardTypes &&
                allContracts &&
                allAddOns &&
                allPromotions &&
                allAllocations
            ) {
                const response = await getContractRoomRates(
                    dates,
                    rooms,
                    hotel,
                    noOfNights,
                    totalAdults,
                    totalChildren,
                    fromDate,
                    toDate,
                    bookBefore,
                    roomTypes,
                    boardTypes,
                    allContracts,
                    allAddOns,
                    allPromotions,
                    allAllocations,
                    clientMarkups,
                    clientStarCategoryMarkups,
                    subAgentMarkups,
                    subAgentStarCategoryMarkups,
                    marketStrategy,
                    profileMarkup,
                    reseller
                );

                return response;
            }

            return [];
        } catch (error) {
            Promise.reject(error);
        }
    }
};

module.exports = {
    getContractHotelRoomRates,
};
