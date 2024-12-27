const sendResellerCredentials = require("./sendResellerCredentials");
const sendResellerApprovalEmail = require("./sendResellerApprovalEmail");
const sendResellerUpdatedCredentials = require("./sendResellerUpdatedCredentials");
const b2bAccountCancellationEmail = require("./b2bAccountCancellationEmail");
const b2bAccountEnbaledEmail = require("./b2bAccountEnbaledEmail");
const b2bAccountDisabledEmail = require("./b2bAccountDisabledEmail");

module.exports = {
    sendResellerCredentials,
    sendResellerApprovalEmail,
    sendResellerUpdatedCredentials,
    b2bAccountCancellationEmail,
    b2bAccountEnbaledEmail,
    b2bAccountDisabledEmail,
};
