const { hotelLogSteps } = require("../../../data");
const { HotelLog } = require("../../../models/hotel");

const createHotelLog = async ({
    stepNumber,
    actionUrl,
    request,
    response,
    processId,
    userId,
}) => {
    try {
        await HotelLog.create({
            processName: hotelLogSteps[stepNumber]?.processName,
            stepNumber,
            stepName: hotelLogSteps[stepNumber]?.stepName,
            comment: hotelLogSteps[stepNumber]?.comment,
            actionUrl,
            requestJson: JSON.stringify(request),
            responseJson: JSON.stringify(response),
            processId,
            userId,
        });
    } catch (err) {
        console.log(err);
    }
};

module.exports = { createHotelLog };
