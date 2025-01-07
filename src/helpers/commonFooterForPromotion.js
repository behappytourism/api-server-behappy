const { B2bHomeSettings } = require("../models");

module.exports = async (hashedCampaignId, hashedEmail) => {
    const unsubscribeUrl = `${process.env.REACT_APP_URL}/unsubscribe?check=${hashedCampaignId}&direct=${hashedEmail}`;
    return `
    <p>If you no longer wish to receive this type of email from us, please <a href="${unsubscribeUrl}">unsubscribe here</a>.</p>
    `;
};
