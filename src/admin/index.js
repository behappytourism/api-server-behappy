const router = require("express").Router();

const { adminAuth } = require("./middlewares");
const {
    admHomeRouter,
    admBlogsRouter,
    admBlogCategoriesRouter,
    admSubscribersRouter,
    admCountriesRouter,
    admDestinationsRouter,
    admGeneralRouter,
    admUsersRouter,
    admDriversRouter,
    admCurrenciesRouter,
    admResellersRouter,
    admEmailSettingsRouter,
    admTransactionsRouter,
    admEmailServicesRouter,
    admEmailsRouter,
    admPaymentServicesRouter,
    admOtpSettingsRouter,
    admB2bWalletsRouter,
    admB2bSpecialMarkupRouter,
    admApiMasterRouter,
    admRefundRouter,
    admA2aTicketRouter,
    admA2aRouter,
    admCitiesRouter,
    admStatesRouter,
    admA2aOrderRouter,
    admA2aMarkupRouter,
    admB2bProfileRouter,
    admB2bSingleProfileRouter,
    admA2aQuotaRouter,
    admRoleRouter,
    admAreaRouter,
    admMarketsRouter,
    b2bGlobalConfigurationsRouter,
    adminB2bAccessRouter,
    admB2bAccessRouter,
    admVisaEnquiryRouter,
    admVisaNationalityRouter,
    admInsuranceRouter,
    admAttractionReviewRouter,
    admAffiliateSettingRouter,
    admAffiliateActivityRouter,
    admAffiliateReportRouter,
    admAffiliateRedeemRequestRouter,
    admMarketStrategyRouter,
    admSeasonRouter,
    admQuotationListingRouter,
    admAttractionCreateOrderRouter,
    admA2aCreateOrderRouter,
    admVisaCreateOrderRouter,
    admAttrGuideRouter,
    admBannerRouter,
    admOrderRouter,
    admB2bHomeRouter,
    admCompanyAddressRouter,
    admB2bFrontedSettingsRouter,
    admB2cFrontedSettingsRouter,
    admSeoRouter,
    admB2bUsersGetInTouchRouter,
    admB2cHomeSettingsRouter,
    admB2BHomeSettingsRouter,
    admB2cBannerRouter,
    admB2bBannerRouter,
    admB2cMarkupProfileRouter,
    admWhatsappServicesRouter,
    admWhatsappManagementRouter,
    admNotitificationRouter,
    admOrderDashboardRouter,
    // admEmailConfigRouter,
    admPromoCodeRouter,
    admVendorRouter,
    admEmailReceiverConfigRouter,
    admAccountNatureRouter,
    admAccountGroupRouter,
    admAccountHeadRouter,
    admAccountGlCodeRouter,
    admEmailListRouter,
    admEmailTemplateRouter,
    admEmailCampaignRouter,
    admEmailImageRouter,
    admEmailCampaignGroupRouter,
    admEmailUnSubscriberRouter,
    admEmailConfigRouter,
    admEmailFooterRouter,
} = require("./routes");
const {
    admAttractionsRouter,
    admAttractionItinerariesRouter,
    admB2cAttractionMarkupRouter,
    admAttractionsOrdersRouter,
    admAttractionCategoriesRouter,
    admAttractionsTicketsRouter,
    admAttractionTicketLogsRouter,
    admAttractionDashboardRouter,
    admAttractionTicketSettingsRouter,
    admAttractionStandAloneRouter,
} = require("./routes/attraction");
const { admAuthRouter } = require("./routes/auth");
const {
    admAirlinesRouter,
    admAirportsRouter,
    admFlightBookingsRouter,
    admCreateFlightOrderRouter,
} = require("./routes/flight");
const {
    admHotelAmenitiesRouter,
    admHotelsRouter,
    admRoomTypesRouter,
    admHotelContractsRouter,
    admHotelPromotionsRouter,
    admBoardTypesRouter,
    admHotelOrdersRouter,
    admContractProvidersRouter,
    admHotelAllocationRouter,
    admHotelAddOnsRouter,
    admAccommodationTypesRouter,
    admHotelBedsRouter,
    admHotelChainsRouter,
    admHotelRequestsRouter,
    admStarCategoriesRouter,
    admHotelGroupAmenitiesRouter,
    admHotelGroupsRouter,
    admHotelContractGroupsRouter,
    admRoomOccupanciesRouter,
    admFeaturedHotelsRouter,
    admHotelBannerAdRouter,
    admB2bHotelResellerSettingsRouter,
    admHotelDashboardRouter,
    admHotelOttilaRouter,
    admHotelProvidersRouter,
    admHotelAvailabilitiesRouter,
} = require("./routes/hotel");
const {
    vehicleTypesRouter,
    admVehicleCategoriesRouter,
    admVehicleBodyTypesRouter,
    admVehicleMakesRouter,
    admVehicleModelsRouter,
    admVehiclesTypeRouter,
    admVehicleTrimRouter,
    admVehiclesRouter,
    admLicenseTypesRouter,
    admTransfersOrderRouter,
} = require("./routes/transfer");
const { admVisaRouter, admVisaMarkupRouter, admVisaApplicationRouter } = require("./routes/visa");
const { vouchersRouter, voucherSettingsRouter, voucherv2Router } = require("./routes/voucher");
const { admTransferRouter, admVehicleRouter, admGroupAreaRouter } = require("./routes/transfers");
const {
    admExcursionRouter,
    admDashboardRouter,
    admQuotationRouter,
    admQuotationInitalRouter,
    admQuotationHotelRouter,
} = require("./routes/quotation");
const { admA2aStatisticsRouter } = require("./routes/a2a");
const { invoiceSettingsRouter } = require("./routes/invoice");
const { admCompanyBankInfoRouter, admB2bWalletDepositRequestsRouter } = require("./routes/global");
const {
    admTourPackagesRouter,
    admTourPackageThemesRouter,
    admTourPackageEnquiriesRouter,
} = require("./routes/TourPackage");

router.use("/auth", admAuthRouter);
router.use("/hotels/contracts", admHotelContractsRouter);

// router.use(adminAuth);

router.use("/attractions/tickets", admAttractionsTicketsRouter);
router.use("/attractions/tickets/log", admAttractionTicketLogsRouter);
router.use("/attractions/categories", admAttractionCategoriesRouter);
router.use("/attractions/orders", admAttractionsOrdersRouter);
router.use("/attractions/b2c/markups", admB2cAttractionMarkupRouter);
router.use("/attractions/itineraries", admAttractionItinerariesRouter);
router.use("/attractions/reviews", admAttractionReviewRouter);
router.use("/attractions/guide", admAttrGuideRouter);
router.use("/attractions/dashboard", admAttractionDashboardRouter);
router.use("/attractions", admAttractionsRouter);
router.use("/attractions/tickets/setting", admAttractionTicketSettingsRouter);
router.use("/attractions/standalone", admAttractionStandAloneRouter);

router.use("/home", admHomeRouter);
router.use("/blogs/categories", admBlogCategoriesRouter);
router.use("/blogs", admBlogsRouter);
router.use("/subscribers", admSubscribersRouter);
router.use("/countries", admCountriesRouter);
router.use("/destinations", admDestinationsRouter);
router.use("/general", admGeneralRouter);
router.use("/users", admUsersRouter);
router.use("/users", admUsersRouter);
router.use("/drivers", admDriversRouter);
router.use("/drivers/license-types", admLicenseTypesRouter);
router.use("/currencies", admCurrenciesRouter);
router.use("/resellers", admResellersRouter);
router.use("/email-services", admEmailServicesRouter);
router.use("/emails", admEmailsRouter);
router.use("/transactions", admTransactionsRouter);
router.use("/payment-services", admPaymentServicesRouter);
router.use("/email-settings", admEmailSettingsRouter);
router.use("/otp-settings", admOtpSettingsRouter);

router.use("/hotels/providers", admHotelProvidersRouter);
router.use("/hotels/amenities/groups", admHotelGroupAmenitiesRouter);
router.use("/hotels/availabilities", admHotelAvailabilitiesRouter);
router.use("/hotels/amenities", admHotelAmenitiesRouter);
router.use("/hotels/groups", admHotelGroupsRouter);
router.use("/hotels/chains", admHotelChainsRouter);
router.use("/hotels/star-categories", admStarCategoriesRouter);
router.use("/hotels/requests", admHotelRequestsRouter);
router.use("/hotels/promotions", admHotelPromotionsRouter);
router.use("/hotels/board-types", admBoardTypesRouter);
router.use("/hotels/orders", admHotelOrdersRouter);
router.use("/hotels/contract-providers", admContractProvidersRouter);
router.use("/hotels/contract-groups", admHotelContractGroupsRouter);
router.use("/hotels/allocations", admHotelAllocationRouter);
router.use("/hotels/add-ons", admHotelAddOnsRouter);
router.use("/hotels/accommodation-types", admAccommodationTypesRouter);
router.use("/hotels/hotel-beds", admHotelBedsRouter);
router.use("/hotels/ottila", admHotelOttilaRouter);
router.use("/hotels/room-occupancies", admRoomOccupanciesRouter);
router.use("/hotels/featured", admFeaturedHotelsRouter);
router.use("/hotels/banner-ads", admHotelBannerAdRouter);
router.use("/hotels/resellers/settings", admB2bHotelResellerSettingsRouter);
router.use("/hotels/dashboard", admHotelDashboardRouter);
router.use("/hotels", admHotelsRouter);
router.use("/room-types", admRoomTypesRouter);

router.use("/airlines", admAirlinesRouter);
router.use("/airports", admAirportsRouter);
router.use("/flights/bookings", admFlightBookingsRouter);

router.use("/visa/application", admVisaApplicationRouter);
router.use("/visa/markup", admVisaMarkupRouter);
router.use("/visa", admVisaRouter);
router.use("/wallets/b2b", admB2bWalletsRouter);
router.use("/wallets/deposit-requests", admB2bWalletDepositRequestsRouter);
router.use("/markup/b2b", admB2bSpecialMarkupRouter);
router.use("/api-master", admApiMasterRouter);
router.use("/refund", admRefundRouter);
router.use("/states", admStatesRouter);
router.use("/cities", admCitiesRouter);

router.use("/transfers/vehicles/categories", admVehicleCategoriesRouter);
router.use("/transfers/vehicles/makes", admVehicleMakesRouter);
router.use("/transfers/vehicles/body-types", admVehicleBodyTypesRouter);
router.use("/transfers/vehicles/models", admVehicleModelsRouter);
router.use("/transfers/vehicles/vehicle-type", admVehiclesTypeRouter);
router.use("/transfers/vehicles/trim", admVehicleTrimRouter);
router.use("/transfers/vehicles", admVehiclesRouter);
router.use("/transfers/vehicle-types", vehicleTypesRouter);
router.use("/transfers/order", admTransfersOrderRouter);

router.use("/a2a", admA2aRouter);
router.use("/a2a/ticket", admA2aTicketRouter);
router.use("/a2a/orders", admA2aOrderRouter);
router.use("/a2a/markup", admA2aMarkupRouter);
router.use("/a2a/quota", admA2aQuotaRouter);
router.use("/a2a/statistics", admA2aStatisticsRouter);

router.use("/profile", admB2bProfileRouter);
router.use("/profile/b2b", admB2bSingleProfileRouter);
router.use("/profile/b2c", admB2cMarkupProfileRouter);

router.use("/roles", admRoleRouter);
router.use("/areas", admAreaRouter);

router.use("/vouchers", vouchersRouter);
router.use("/v2/vouchers", voucherv2Router);
router.use("/vouchers/settings", voucherSettingsRouter);

router.use("/transfer", admTransferRouter);
router.use("/transfer/vehicle", admVehicleRouter);
router.use("/group-area", admGroupAreaRouter);

router.use("/quotations", admQuotationRouter);
router.use("/quotations/inital", admQuotationInitalRouter);
router.use("/quotations/excursion", admExcursionRouter);
router.use("/quotations/dashboard", admDashboardRouter);
router.use("/quotations/hotels", admQuotationHotelRouter);
router.use("/b2b-configurations", b2bGlobalConfigurationsRouter);
router.use("/quotations/reseller", admQuotationListingRouter);

router.use("/markets", admMarketsRouter);
router.use("/access", admB2bAccessRouter);

router.use("/visa/enquiry", admVisaEnquiryRouter);
router.use("/visa/nationality", admVisaNationalityRouter);

//insurance
router.use("/insurance", admInsuranceRouter);

//Affiliate
router.use("/affiliate/settings", admAffiliateSettingRouter);
router.use("/affiliate/activity", admAffiliateActivityRouter);
router.use("/affiliate/reports", admAffiliateReportRouter);
router.use("/affiliate/redeem", admAffiliateRedeemRequestRouter);

//Market
router.use("/market", admMarketStrategyRouter);

router.use("/season", admSeasonRouter);

// Invoice
router.use("/invoice", invoiceSettingsRouter);

//create Orders
router.use("/orders/attraction", admAttractionCreateOrderRouter);
router.use("/orders/a2a", admA2aCreateOrderRouter);
router.use("/orders/visa", admVisaCreateOrderRouter);
router.use("/orders/flight", admCreateFlightOrderRouter);

router.use("/company/bank-info", admCompanyBankInfoRouter);

router.use("/banners", admBannerRouter);

// Tour Packages
router.use("/tour-packages/themes", admTourPackageThemesRouter);
router.use("/tour-packages/enquiries", admTourPackageEnquiriesRouter);
router.use("/tour-packages", admTourPackagesRouter);

router.use("/orders", admOrderRouter);
router.use("/b2b/home", admB2bHomeRouter);

router.use("/company/addresses", admCompanyAddressRouter);
//frontend

router.use("/frontend/b2b/home", admB2BHomeSettingsRouter);
router.use("/frontend/b2c/home", admB2cHomeSettingsRouter);
router.use("/frontend/b2b/banners", admB2bBannerRouter);
router.use("/frontend/b2c/banners", admB2cBannerRouter);

//seo

router.use("/seo", admSeoRouter);
router.use("/whatsapp-service", admWhatsappServicesRouter);
router.use("/whatsapp-managment", admWhatsappManagementRouter);
router.use("/notification", admNotitificationRouter);

// frontend user getInTouch messages router
router.use("/frontend/b2b/getInTouch", admB2bUsersGetInTouchRouter);
router.use("/dashboard", admOrderDashboardRouter);
// router.use("/email-config", admEmailConfigRouter);
router.use("/email-receiver-config", admEmailReceiverConfigRouter);

router.use("/promo-code", admPromoCodeRouter);
router.use("/vendor", admVendorRouter);

//accounts

router.use("/account/head", admAccountHeadRouter);
router.use("/account/nature", admAccountNatureRouter);
router.use("/account/group", admAccountGroupRouter);
router.use("/account/gl-code", admAccountGlCodeRouter);

//email

router.use("/email/list", admEmailListRouter);
router.use("/email/template", admEmailTemplateRouter);
router.use("/email/campaign", admEmailCampaignRouter);
router.use("/email/image", admEmailImageRouter);
router.use("/email/campaign/group", admEmailCampaignGroupRouter);
router.use("/email/unsubscribe", admEmailUnSubscriberRouter);
router.use("/email/configs", admEmailConfigRouter);
router.use("/email/footers", admEmailFooterRouter);

module.exports = router;
