const { B2bHomeSettings } = require("../models");

module.exports = async () => {
    const companyDetails = await B2bHomeSettings.findOne();
    const companyLogo = process.env.COMPANY_LOGO;
    const companyRegName = process.env.COMPANY_REGISTRATION_NAME;
    return `
    <span>Best Regards</span> <br />
    <span>${process.env.COMPANY_NAME}</span><br />
    <span>Email :- ${companyDetails.email}</span> <br />
    <span>WhatsApp :-${companyDetails.phoneNumber1}</span> <br />
    <span>Customer Care :- ${companyDetails.phoneNumber2} </span> <br />
    <hr style="border:none; border-top:1px solid #eee" /> <br />
    <img src="${companyLogo}" width="150" /> <br />

    `;
};
