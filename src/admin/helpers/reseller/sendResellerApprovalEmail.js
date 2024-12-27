const { sendEmail } = require("../../../helpers");

const companyLogo = process.env.COMPANY_LOGO;
const companyRegName = process.env.COMPANY_REGISTRATION_NAME;

const sendResellerApprovalEmail = async ({ email, name, agentCode }) => {
    try {
        sendEmail(
            email,
            `Welcome to ${companyRegName} B2B Portal - Your account has been approved!`,
            `<div>
                <span>Dear ${name},</span><br />
                <br />
                <span>Congratulations! We are thrilled to inform you that your B2B account with ${process.env.COMPANY_NAME} has been approved. Welcome to our platform!</span><br />
                <br />
                <span>Below, you will find your account details:</span>
                <br />
                <br />
                <span><strong>B2b Portal URL :</strong> ${process.env.B2B_WEB_URL}</span>
                <br />
                <span><strong>Agent Code :</strong> ${agentCode}</span>
                <br />
                <span><strong>Email :</strong> ${email}</span>
                <br />
                <br />
                <span>Thank you for choosing ${process.env.COMPANY_NAME}  B2B Portal. We are committed to providing you with the best rates. Our team is dedicated to ensuring your experience with us is seamless and rewarding.</span><br />
                <br />
                <span>We look forward to a successful partnership with you.</span><br />
                <br />
                <span>Best regards,</span><br />
                <span>${companyRegName}</span><br />
                <img src="${companyLogo}" width="150" />
            </div>`
        );
    } catch (error) {
        console.log(error);
        console.log("E-mail not sent");
    }
};

module.exports = sendResellerApprovalEmail;
