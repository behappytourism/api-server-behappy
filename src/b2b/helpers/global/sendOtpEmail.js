const { sendEmail } = require("../../../helpers");

const companyLogo = process.env.COMPANY_LOGO;
const companyRegName = process.env.COMPANY_REGISTRATION_NAME;
const companyName = process.env.COMPANY_NAME;

const sendOtpEmail = ({ agentName, email, product, referenceNumber }) => {
    try {
        // const randomOtp = 12345;
        const randomOtp = Math.floor(Math.random() * (99999 - 10000)) + 10000;

        const subject = `Otp to complete your ${product} booking Ref.No ${referenceNumber} at ${companyName}.`;
        const body = `
        <span>Dear ${agentName},</span><br />
        <br />
        <span>Please use this otp below to complete the transaction.</span><br />
        <br />
        <span style="font-weight: 600;">OTP: ${randomOtp}</span><br />
        
        <br />
        <br />
        <span>Thanks and regards</span><br />
        <span>${companyRegName}</span><br />
        <img src="${companyLogo}" width="150" />`;

        sendEmail(email, subject, body);

        return randomOtp;
    } catch (err) {
        console.log(err);
    }
};

module.exports = sendOtpEmail;
