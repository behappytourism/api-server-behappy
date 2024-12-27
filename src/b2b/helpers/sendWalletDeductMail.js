const { sendEmail } = require("../../helpers");
const commonFooter = require("../../helpers/commonFooter");

const sendWalletDeductMail = async (reseller, order, amount) => {
    try {
        const footerHtml = await commonFooter();

        sendEmail(
            reseller.email,
            "Wallet Amount Deducted Notification",
            `<div style="font-family: Helvetica,Arial,sans-serif;min-width:1000px;overflow:auto;line-height:2">
      <div style="margin:50px auto;width:70%;padding:20px 0">
        <div style="border-bottom:1px solid #eee">
          <a href="" style="font-size:1.4em;color: #00466a;text-decoration:none;font-weight:600">${process.env.COMPANY_NAME}</a>
        </div>
        <p style="font-size:1.1em">Hi,</p>
          <body style="font-family: Arial, sans-serif;">
        <h2 style="text-align: center;">Dear ${reseller.name},</h2>
        <p style="margin: 20px 0;">This is an automated notification to inform you that an amount of ${amount} AED has been debited from your wallet on ${order?.createdAt}. This debit was made for the following transaction: ${order?.referenceNumber}.</p>
        <p style="margin: 20px 0;">Please log on to your account to view the details of the transaction. If you have any questions or concerns, please feel free to contact us.</p>
        <p style="margin: 20px 0;">Thank you for choosing ${process.env.COMPANY_NAME}</p>
        ${footerHtml}

      </body>
    
      
      </div>
    </div>
         `
        );
    } catch (err) {
        console.log(err);
    }
};

module.exports = sendWalletDeductMail;
