const commonFooterPromotion = require("../../../helpers/commonFooterForPromotion");
const sendEmailPromotion = require("../../../helpers/sendEmailPromotion");

const sendCampaignEmail = async ({
    email,
    subject,
    html,
    hashedCampaignId,
    hashedEmail,
    footerData,
    emailConfigData,
}) => {
    try {
        const footerHtml = await commonFooterPromotion(hashedCampaignId, hashedEmail);
        const combinedHtml = `<div>${html}${footerData}${footerHtml}</div>`;
        sendEmailPromotion({
            email: email,
            subject: `${subject}`,
            text: combinedHtml,
            emailConfig: emailConfigData,
        });

        console.log("email has been sent");
    } catch (error) {
        console.log(error);
        console.log("E-mail not sent");
    }
};

module.exports = sendCampaignEmail;
