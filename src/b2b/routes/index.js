const b2bResellersAuthRouter = require("./global/b2bResellersAuthRouter");
const b2bResellersRouter = require("./auth/b2bResellersRouter");
const b2bClientAttractionRouter = require("./attraction/b2bClientAttractionRoute");
const b2bClientAttractionMarkupRouter = require("./attraction/b2bClientAttractionMarkupRoute");
const b2bSubAgentAttractionMarkupRouter = require("./attraction/b2bSubAgentAttractionMarkupRouter");
const b2bWalletRouter = require("./global/b2bWalletRouter");
const b2bAttractionOrdersRouter = require("./attraction/b2bAttractionOrdersRoute");
const b2bTransactionRouter = require("./global/b2bTransactionsRouter");
const b2bSubAgentVisaMarkupRouter = require("./visa/b2bSubAgentVisaMarkupRouter");
const b2bClientVisaMarkupRouter = require("./visa/b2bClientVisaMarkRouter");
const b2bVisaRouter = require("./visa/b2bVisaRouter");
const b2bVisaApplicationListRouter = require("./visa/b2bVisaApplicationListRouter");
const b2bVisaListRouter = require("./visa/b2bVisaListRouter");
const b2bAttractionTicketsRouter = require("./attraction/b2bAttractionTicketsRouter");
const b2bClientFlightMarkupRouter = require("./flight/b2bClientFlightMarkupRouter");
const b2bSubAgentFightMarkupRouter = require("./flight/b2bSubAgentFlightMarkupRouter");
const b2bFlightsRouter = require("./flight/b2bFlightsRouter");
const b2bHotelAvailabilitiesRouter = require("./hotel/b2bHotelAvailabilitiesRouter");
const b2bHotelOrdersRouter = require("./hotel/b2bHotelOrdersRouter");
const b2bHotelsRouter = require("./hotel/b2bHotelsRouter");
const b2bA2aRouter = require("./a2a/b2bA2aRouter");
const b2bA2aOrderRouter = require("./a2a/b2bA2aOrderRouter");
const b2bHotelMarkup = require("./hotel/b2bHotelMarkupRouter");
const b2bHotelRequestsRouter = require("./hotel/b2bHotelRequestsRouter");
const b2bHotelQuotationRouter = require("./quotation/b2bQuotationHotelRouter");
const b2bQuotationRouter = require("./quotation/b2bQuotationRouter");
const b2bQuotationInitalRouter = require("./quotation/b2bQuotationInitalRouter");
const b2bQuotationHotelRouter = require("./quotation/b2bQuotationHotelRouter");
const b2bVisaEnquiryRouter = require("./visa/b2bVisaEnquiryRouter");
const b2bConfigurationsRouter = require("./global/b2bConfigurationsRouter");
const b2bQuotationMarkupRouter = require("./quotation/b2bQuotationMarkupRouter");
const b2bInsuranceRouter = require("./insurance/b2bInsuranceRouter");
const b2bWalletDepositRequestsRouter = require("./global/b2bWalletDepositRequestsRouter");
const b2bCompanyBankInfoRouter = require("./global/b2bCompanyBankInfoRouter");
const b2bWalletWithdrawlRequestsRouter = require("./global/b2bWalletWithdrawlRequestsRouter");
const b2bBanksRouter = require("./global/b2bBanksRouter");
const b2bWithdrawalsRouter = require("./global/b2bWithdrawalsRouter");
const b2bTranferRouter = require("./transfer/b2bTransferAvailabilitiesRouter");
const b2bTransferOrderRouter = require("./transfer/b2bTransferOrderRouter"); //
const b2bOrderRouter = require("./order/b2bOrderRouter");
const b2bHomeRouter = require("./global/b2bHomeRouter");
const b2bTransferClientMarkupRouter = require("./transfer/b2bTransferClientMarkupRouter");
const b2bTransferSubAgentMarkupRouter = require("./transfer/b2bTransferSubAgentMarkupRouter");
const b2bFrontendRouter = require("./global/b2bFrontendRouter");
// Api Routes
const b2bResellerAuthApiRouter = require("./apiGlobal/b2bResellerApiAuthRouter");
const b2bPromoCodeRouter = require("./promoCode/b2bPromoCodeRouter");
module.exports = {
    b2bResellersAuthRouter,
    b2bResellersRouter,
    b2bClientAttractionRouter,
    b2bClientAttractionMarkupRouter,
    b2bSubAgentAttractionMarkupRouter,
    b2bWalletRouter,
    b2bAttractionOrdersRouter,
    b2bTransactionRouter,
    b2bClientVisaMarkupRouter,
    b2bSubAgentVisaMarkupRouter,
    b2bVisaRouter,
    b2bVisaApplicationListRouter,
    b2bVisaListRouter,
    b2bAttractionTicketsRouter,
    b2bClientFlightMarkupRouter,
    b2bSubAgentFightMarkupRouter,
    b2bFlightsRouter,
    b2bA2aRouter,
    b2bA2aOrderRouter,
    b2bHotelAvailabilitiesRouter,
    b2bHotelOrdersRouter,
    b2bHotelMarkup,
    b2bHotelRequestsRouter,
    b2bHotelQuotationRouter,
    b2bQuotationRouter,
    b2bQuotationInitalRouter,
    b2bQuotationHotelRouter,
    b2bQuotationRouter,
    b2bHotelsRouter,
    b2bVisaEnquiryRouter,
    b2bConfigurationsRouter,
    b2bQuotationMarkupRouter,
    b2bInsuranceRouter,
    b2bWalletDepositRequestsRouter,
    b2bCompanyBankInfoRouter,
    b2bWalletWithdrawlRequestsRouter,
    b2bBanksRouter,
    b2bResellerAuthApiRouter,
    b2bWithdrawalsRouter,
    b2bTranferRouter,
    b2bTransferOrderRouter,
    b2bOrderRouter,
    b2bHomeRouter,
    b2bTransferClientMarkupRouter,
    b2bTransferSubAgentMarkupRouter,
    b2bFrontendRouter,
    b2bPromoCodeRouter,
};
