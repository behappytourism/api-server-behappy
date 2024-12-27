const nodeCCAvenue = require("node-ccavenue");

const ccav = new nodeCCAvenue.Configure({
    merchant_id: process.env.CCAVENUE_MERCHANT_ID,
    working_key: process.env.CCAVENUE_WORKING_KEY,
});

const ccavenueFormHandler = async ({ res, orderId, totalAmount, redirectUrl, cancelUrl }) => {
    try {
        const orderParams = {
            merchant_id: process.env.CCAVENUE_MERCHANT_ID,
            order_id: orderId,
            currency: "AED",
            amount: totalAmount,
            redirect_url: redirectUrl,
            cancel_url: cancelUrl,
            language: "EN",
        };
        let accessCode = process.env.CCAVENUE_ACCESS_CODE;

        const encRequest = ccav.getEncryptedOrder(orderParams);
        const formbody =
            '<form id="nonseamless" method="post" name="redirect" action="https://secure.ccavenue.ae/transaction/transaction.do?command=initiateTransaction"/> <input type="hidden" id="encRequest" name="encRequest" value="' +
            encRequest +
            '"><input type="hidden" name="access_code" id="access_code" value="' +
            accessCode +
            '"><script language="javascript">document.redirect.submit();</script></form>';

        res.setHeader("Content-Type", "text/html");
        res.write(formbody);
        res.end();
    } catch (err) {
        throw new Error(err);
    }
};

module.exports = ccavenueFormHandler;
