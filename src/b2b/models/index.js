const Reseller = require("./global/reseller.model");
const B2BClientAttractionMarkup = require("./attraction/b2bClientAttraction.model");
const B2BSubAgentAttractionMarkup = require("./attraction/b2bSubAgentAttractionMarkup");
const B2BTransaction = require("./global/b2bTransaction.model");
const B2BWallet = require("./global/b2bWallet.model");
const B2BAttractionOrder = require("./attraction/b2bAttractionOrder.model");
const B2BClientVisaMarkup = require("./visa/b2bClientVisaMarkUp.modal");
const B2BSubAgentVisaMarkup = require("./visa/b2bSubAgentVisaMarkup.modal");
const B2BSpecialAttractionMarkup = require("./attraction/b2bAttractionSpecialMarkup.modal");
const B2BSpecialVisaMarkup = require("./visa/b2bVisaSpecialMarkup.modal");
const B2BBankDetails = require("./global/b2bBankDetails.model");
const B2BWalletWithdrawRequest = require("./global/b2bWithdrawRequest.model");
const B2BClientFlightMarkup = require("./flight/b2bClientFlightMarkup.model");
const B2BSubAgentFlightMarkup = require("./flight/b2bSubAgentFlightMarkup.model");
const B2BA2a = require("./a2a/b2bA2a.model");
const B2BA2aTicket = require("./a2a/b2bA2aTicket.model");
const B2BA2aOrder = require("./a2a/b2bA2aOrder.model");
const B2BA2aTicketMarkup = require("./a2a/b2bA2aTicketMarkup.model");
const B2BSpecialA2aMarkup = require("./a2a/b2bA2aSpecialMarkup.model");
const B2BMarkupProfile = require("./global/b2bMarkupProfile.model");
const B2bClientHotelMarkup = require("./hotel/b2bClientHotelMarkup.model");
const B2bSubAgentHotelMarkup = require("./hotel/b2bSubAgentHotelMarkup.model");
const ResellerConfiguration = require("./global/resellerConfiguration.model");
const B2BSubAgentQuotationMarkup = require("./quotation/b2bSubAgentQuotationMarkup.model");
const b2bClientQuotationMarkup = require("./quotation/b2bClientQuotationMarkup.model");
const B2bFlightOrder = require("./flight/b2bFlightOrder.model");
const B2bInsurnaceContract = require("./insurance/b2bInsuranceContract.model");
const B2BVisaApplication = require("./visa/b2bVisaApplication.model");
const B2BWalletDeposit = require("./global/b2bWalletDeposit.model");
const B2bWalletDepositRequest = require("./global/b2bWalletDepositRequest.model");
const B2bWalletWithdraw = require("./global/b2bWalletWithdraw.model");
const B2BAttractionOrderCancellation = require("./attraction/b2bAttractionCancellation.model");
const B2BTransferOrder = require("./transfer/b2bTransferOrder.model");
const B2BTransferOrderPayment = require("./transfer/b2bTransferPayment.model");
const B2BOrder = require("./order/b2bOrder.model");
const B2BOrderPayment = require("./order/b2bOrderPayment.model");
const B2BSubAgentTransferMarkup = require("./transfer/b2bSubAgentTransferMarkup.model");
const B2BClientTransferMarkup = require("./transfer/b2bSubAgentTransferMarkup.model");
// const B2BBannerSetting = require("./global/b2bHomeSettings.model");
const b2bGetInTouch = require("./global/b2bGetInTouch.model");
const B2bPromoCode = require("./global/b2bPromoCode.model");
const B2bUser = require("./global/b2bUser.model");
const Vendor = require("./global/vendor.model");
const VendorConfiguration = require("./global/vendorConfigration.model");
const B2BTransferOrderCancellation = require("./transfer/b2bTransferOrderCancellation.model");
const B2BTransferOrderRefund = require("./transfer/b2bTransferOrderRefund.model");
const B2BOrderCancellation = require("./order/b2bOrderCancellation.model");
const B2BOrderRefund = require("./order/b2bOrderRefund.model");
const B2bA2aOrderLog = require("./a2a/b2bA2aOrderLog.model");
module.exports = {
    Reseller,
    B2BClientVisaMarkup,
    B2BSubAgentVisaMarkup,
    B2BClientAttractionMarkup,
    B2BSubAgentAttractionMarkup,
    B2BTransaction,
    B2BWallet,
    B2BAttractionOrder,
    B2BSpecialAttractionMarkup,
    B2BSpecialVisaMarkup,
    B2BBankDetails,
    B2BWalletWithdrawRequest,
    B2BSubAgentFlightMarkup,
    B2BClientFlightMarkup,
    B2BA2a,
    B2BA2aTicket,
    B2BA2aOrder,
    B2BA2aTicketMarkup,
    B2BSpecialA2aMarkup,
    B2BMarkupProfile,
    B2bClientHotelMarkup,
    B2bSubAgentHotelMarkup,
    ResellerConfiguration,
    B2BSubAgentQuotationMarkup,
    b2bClientQuotationMarkup,
    B2bFlightOrder,
    B2bInsurnaceContract,
    B2BVisaApplication,
    B2BWalletDeposit,
    B2bWalletDepositRequest,
    B2bWalletWithdraw,
    B2BAttractionOrderCancellation,
    B2BTransferOrder,
    B2BTransferOrderPayment,
    B2BOrder,
    B2BOrderPayment,
    B2BClientTransferMarkup,
    B2BSubAgentTransferMarkup,
    // B2BHomeSetting,
    b2bGetInTouch,
    B2bPromoCode,
    B2bUser,
    Vendor,
    VendorConfiguration,
    B2BTransferOrderCancellation,
    B2BTransferOrderRefund,
    B2BOrderCancellation,
    B2BOrderRefund,
    B2bA2aOrderLog,
};
