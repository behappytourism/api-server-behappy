const { ccAvenueLogSteps } = require("../data");
const { CcavenueLog } = require("../models");

const createCcAvenueLog = async ({
    stepNumber,
    redirectionUrl,
    request,
    response,
    amount,
    orderType,
    orderId,
}) => {
    try {
        console.log("call reached");
        await CcavenueLog.create({
            processName: ccAvenueLogSteps[stepNumber]?.processName,
            stepNumber,
            stepName: ccAvenueLogSteps[stepNumber]?.stepName,
            comment: ccAvenueLogSteps[stepNumber]?.comment,
            redirectionUrl,
            request: request,
            response: response,
            amount: amount,
            orderType,
            orderId,
        });
    } catch (err) {
        console.log(err);
    }
};
module.exports = { createCcAvenueLog };