const { sendEmail } = require("../../../../helpers");

const companyLogo = process.env.COMPANY_LOGO;
const companyRegName = process.env.COMPANY_REGISTRATION_NAME;

const cancellationConfirmationEmailToReseller = ({ email, name, referenceNumber }) => {
    try {
        const subject = `Cancellation of hotel order ${referenceNumber}`;
        sendEmail(
            email,
            subject,
            `
        <span>Dear ${name}</span><br />
        <br />
        <span>Your cancellation request has been processed and the refund has been processed to your wallet.</span><br />

        <br />
        <br />
        <span>Thanks and regards</span><br />
        <span>${companyRegName}</span><br />
        <img src="${companyLogo}" width="150" />
        `
        );
    } catch (err) {
        console.log(err);
    }
};

module.exports = cancellationConfirmationEmailToReseller;
