const router = require("express").Router();

const {
    b2bResellersAuthRouter,
    b2bAttractionOrdersRouter,
    b2bResellersRouter,
    b2bClientAttractionRouter,
    b2bClientAttractionMarkupRouter,
    b2bSubAgentAttractionMarkupRouter,
    b2bWalletRouter,
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
    b2bAttractionOrderApiRouter,
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
} = require("./routes");
const {
    b2bApiAttractionsRouter,
    b2bApiAttractionsOrderRouter,
} = require("./routes/attractionsApi");
const { b2bHotelOrderApiRouter, b2bHotelApiAvailabilityRouter } = require("./routes/hotelApi");
const { b2bTourPackageEnquiryRouter, b2bTourPackagesRouter } = require("./routes/tourPackage");

router.use("/resellers/auth", b2bResellersAuthRouter);
router.use("/resellers", b2bResellersRouter);
router.use("/resellers/client/attraction", b2bClientAttractionRouter);
router.use("/resellers/client/markup", b2bClientAttractionMarkupRouter);
router.use("/resellers/subagent/markup", b2bSubAgentAttractionMarkupRouter);
router.use("/resellers/wallet", b2bWalletRouter);
router.use("/wallets/deposit-requests", b2bWalletDepositRequestsRouter);
router.use("/wallets/withdraw-requests", b2bWalletWithdrawlRequestsRouter);
router.use("/wallets/withdrawals", b2bWithdrawalsRouter);
router.use("/attractions/orders", b2bAttractionOrdersRouter);
router.use("/attractions/tickets", b2bAttractionTicketsRouter);
router.use("/transactions", b2bTransactionRouter);
router.use("/subagent/visa/markup", b2bSubAgentVisaMarkupRouter);
router.use("/client/visa/markup", b2bClientVisaMarkupRouter);
router.use("/visa", b2bVisaListRouter);
router.use("/visa/application", b2bVisaRouter);
router.use("/visa/application/list", b2bVisaApplicationListRouter);
router.use("/flight", b2bFlightsRouter);
router.use("/client/flight/markup", b2bClientFlightMarkupRouter);
router.use("/subagent/flight/markup", b2bSubAgentFightMarkupRouter);
router.use("/a2a", b2bA2aRouter);
router.use("/a2a/orders", b2bA2aOrderRouter);
router.use("/hotels", b2bHotelsRouter);
router.use("/hotels/availabilities", b2bHotelAvailabilitiesRouter);
router.use("/hotels/orders", b2bHotelOrdersRouter);
router.use("/hotels/markup", b2bHotelMarkup);
router.use("/hotels/requests", b2bHotelRequestsRouter);
router.use("/quotations", b2bQuotationRouter);
router.use("/quotations/inital", b2bQuotationInitalRouter);
router.use("/quotations/hotels", b2bQuotationHotelRouter);
router.use("/visa/enquiry", b2bVisaEnquiryRouter);
router.use("/configurations", b2bConfigurationsRouter);
router.use("/quotation/markup", b2bQuotationMarkupRouter);
router.use("/insurance", b2bInsuranceRouter);
router.use("/company/bank-info", b2bCompanyBankInfoRouter);
router.use("/banks", b2bBanksRouter);
router.use("/api/reseller/auth", b2bResellerAuthApiRouter);
router.use("/tour-packages/enquiries", b2bTourPackageEnquiryRouter);
router.use("/tour-packages", b2bTourPackagesRouter);

router.use("/transfer", b2bTranferRouter);
router.use("/transfer/order", b2bTransferOrderRouter);
router.use("/transfer", b2bTranferRouter);
router.use("/transfer/client/markup", b2bTransferClientMarkupRouter);
router.use("/transfer/sub-agent/markup", b2bTransferSubAgentMarkupRouter);

router.use("/orders", b2bOrderRouter);
router.use("/home", b2bHomeRouter);
router.use("/settings", b2bFrontendRouter);

// API Routes
router.use("/attraction-api", b2bApiAttractionsRouter);
router.use("/attraction-api/orders", b2bApiAttractionsOrderRouter);
router.use("/api/hotels/availabilities", b2bHotelApiAvailabilityRouter);
router.use("/api/hotels/orders", b2bHotelOrderApiRouter);
router.use("/promo-code", b2bPromoCodeRouter);

module.exports = router;
