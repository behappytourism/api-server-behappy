const Admin = require("./admin.model");
const EmailService = require("./emailService.model");
const EmailSendList = require("./EmailSendList.model");
const Email = require("./email.model");
const AdminRole = require("./adminRole.model");
const VoucherAmendment = require("./voucherAmendment.model");
const Voucher = require("./voucher.model");
const B2BGlobalConfiguration = require("./b2bGlobalConfiguration.model");
const VoucherSettings = require("./voucherSettings.model");
const MarketStrategy = require("./marketStrategy.model");
const VoucherV2 = require("./voucerV2.model");
const VoucherAmendmentV2 = require("./voucherAmendmentV2.model");

module.exports = {
    Admin,
    EmailService,
    Email,
    EmailSendList,
    AdminRole,
    VoucherAmendment,
    Voucher,
    B2BGlobalConfiguration,
    VoucherSettings,
    MarketStrategy,
    VoucherV2,
    VoucherAmendmentV2,
};
