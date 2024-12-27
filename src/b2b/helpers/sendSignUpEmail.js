const { sendEmail } = require("../../helpers");

const sendSignUpEmail = async (email, agentCode, companyName) => {
    try {
        const companyLogo = process.env.COMPANY_LOGO;
        const companyRegName = process.env.COMPANY_REGISTRATION_NAME;
        sendEmail(
            email,
            `Welcome to ${companyRegName} B2B Portal!`,
            `<div>
              <span>Dear ${companyName},</span><br />
              <br />
              <span>Thank you for registering with the ${process.env.COMPANY_NAME} B2B Portal! Your account is currently under review. We appreciate your patience.</span>
              <br />
              <br />
              <span>Below, you will find your account details:</span><br />
              <br />
              <span><strong>B2b Portal URL :</strong> ${process.env.B2B_WEB_URL}</span><br />
              <span><strong>Agent Code :</strong> ${agentCode}</span><br />
              <span><strong>Email :</strong> ${email}</span><br />
              <br />
              <br />
              <span>Best regards,</span><br />
              <span>${companyRegName}</span><br />
              <img src="${companyLogo}" width="150" />
          </div>`
        );

        console.log("email has been sent");
    } catch (error) {
        console.log(error);
        console.log("E-mail not sent");
    }
};

module.exports = sendSignUpEmail;
