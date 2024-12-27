const { sendEmail } = require("../../../helpers");

const companyLogo = process.env.COMPANY_LOGO;
const companyRegName = process.env.COMPANY_REGISTRATION_NAME;

const hotelOrderCancellationRequestEmailForReseller = ({ email, name, referenceNumber }) => {
    try {
        const subject = `Cancellation of hotel order ${referenceNumber}`;
        sendEmail(
            email,
            subject,
            `
        <span>Dear ${name}</span><br />
        <br />
        <span>Your cancellation request has been received and is being processed with the hotel.</span><br />
        <span>Should there be a cancellation charge the Team will update you separately.</span><br />

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

module.exports = hotelOrderCancellationRequestEmailForReseller;
