const { sendEmail } = require("../../helpers");
const commonFooter = require("../../helpers/commonFooter");

const sendSubAgentRegistrationEmail = async ({ agentCode, email, password, companyName }) => {
    try {
        const footerHtml = await commonFooter();

        sendEmail(
            email,
            `Welcome to ${process.env.COMPANY_NAME} B2B portal.`,
            `<div>
                <span>We welcome ${companyName} to the ${process.env.COMPANY_NAME} Booking environment. Kindly use the following details to log in to our B2B Portal.</span>
                <br />
                <br />
                <span>URL : ${process.env.B2B_WEB_URL}</span><br />
                <span>Agent Code : ${agentCode}</span><br />
                <span>Email : ${email}</span><br />
                <span>Password : ${password}</span>
                <br />
                <br />
                <span>Note: You can reset your password once you log in, should you wish to.</span>
                <br />
                <br />
                ${footerHtml}
               
            </div>
         `
        );
    } catch (err) {
        console.log(err);
    }
};

module.exports = sendSubAgentRegistrationEmail;
