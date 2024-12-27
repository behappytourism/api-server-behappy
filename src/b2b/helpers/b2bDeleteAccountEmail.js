const { sendEmail } = require("../../helpers");
const commonFooter = require("../../helpers/commonFooter");
const sendAdminEmail = require("../../helpers/sendAdminEmail");

const b2bAccountDeleteEmail = async (reseller) => {
    try {
        const footerHtml = await commonFooter();

        sendAdminEmail(
            `B2b Account Delete Email - AgentCode ${reseller?.agentCode}`,
            `<div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
            <div style="margin:50px auto;width:70%;padding:20px 0">
              <div style="border-bottom:1px solid #eee">
                <a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">${process.env.COMPANY_NAME}</a>
              </div>
              <p style="font-size:1.1em">Hi,</p>
              <p>The company, ${reseller?.companyName}, has disabled their account. Please review the following details: Agent Code - ${reseller.agentCode}.</p>
              ${footerHtml}

              </div>
            </div>
         `
        );

        console.log("email has been sent");
    } catch (error) {
        console.log(error);
        console.log("E-mail not sent");
    }
};

module.exports = b2bAccountDeleteEmail;
