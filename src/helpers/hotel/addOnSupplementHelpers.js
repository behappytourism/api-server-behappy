const { isValidObjectId } = require("mongoose");
const { HotelAddOn } = require("../../models/hotel");

const applySelectedAddOnSupplement = async ({
    addOnSupplements,
    fromDate,
    toDate,
    hotelId,
    roomTypeId,
    boardType,
    roomsCount,
    noOfNights,
    totalAdults,
    totalChildren,
}) => {
    try {
        let addOnSupplementPrice = 0;
        for (let i = 0; i < addOnSupplements?.length; i++) {
            // console.log("supplement");
            // if (!isValidObjectId(addOnSupplements[i])) {

            // }
            const addOn = await HotelAddOn.findOne({
                _id: addOnSupplements[i],
                fromDate: { $lte: new Date(fromDate) },
                toDate: { $gte: new Date(toDate) },
                hotel: hotelId,
                roomTypes: roomTypeId,
                boardTypes: boardType,
                isMandatory: false,
                isDeleted: false,
            });

            if (!addOn) {
                throw new Error("sorry selected add on not found or not available on your date");
            }

            if (addOn?.applyOn === "pax") {
                let adultAddOnPrice = addOn?.adultPrice * totalAdults * noOfNights;
                let childAddOnPrice = addOn?.childPrice * totalChildren * noOfNights;
                addOnSupplementPrice = adultAddOnPrice + childAddOnPrice;
            } else if (addOn?.applyOn === "room") {
                addOnSupplementPrice = addOn?.roomPrice * roomsCount * noOfNights;
            } else {
                throw new Error("something went wrong on supplement addons");
            }
        }

        return addOnSupplementPrice;
    } catch (err) {
        throw err;
    }
};

module.exports = { applySelectedAddOnSupplement };
