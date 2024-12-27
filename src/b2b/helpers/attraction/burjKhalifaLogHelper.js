const { burjKhalifaLogSteps } = require("../../../data");
const { BurjKhalifaLog } = require("../../../models");

const createBurjKhalifaLog = async ({
    stepNumber,
    actionUrl,
    request,
    response,
    referenceNumber,
    userId,
}) => {
    try {
        await BurjKhalifaLog.create({
            processName: burjKhalifaLogSteps[stepNumber]?.processName,
            stepNumber,
            stepName: burjKhalifaLogSteps[stepNumber]?.stepName,
            comment: burjKhalifaLogSteps[stepNumber]?.comment,
            actionUrl,
            request: request,
            response: response,
            referenceNumber,
            userId,
        });
    } catch (err) {
        console.log(err);
    }
};

module.exports = { createBurjKhalifaLog };
