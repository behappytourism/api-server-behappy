const admHomeRouter = require("./global/admHomeRouter");
const admBlogsRouter = require("./blog/admBlogsRouter");
const admBlogCategoriesRouter = require("./blog/admBlogCategoriesRouter");
const admSubscribersRouter = require("./global/admSubscribersRouter");
const admCountriesRouter = require("./settings/admCountriesRouter");
const admDestinationsRouter = require("./attraction/admDestinationsRouter");
const admGeneralRouter = require("./global/admGeneralRouter");
const admDashboardRouter = require("./global/admDashboardRouter");
const admUsersRouter = require("./global/admUsersRouter");
const admDriversRouter = require("./global/admDriversRouter");
const admCurrenciesRouter = require("./settings/admCurrenciesRouter");
const admResellersRouter = require("./global/admResellersRouter");
const admEmailServicesRouter = require("./settings/admEmailServicesRouter");
const admEmailsRouter = require("./settings/admEmailsRouter");
const admTransactionsRouter = require("./global/admTransactionsRouter");
const admPaymentServicesRouter = require("./settings/admPaymentServicesRouter");
const admEmailSettingsRouter = require("./settings/admEmailSettingsRouter");
const admOtpSettingsRouter = require("./settings/admOtpSettingsRouter");
const admB2bWalletsRouter = require("./global/admB2bWalletsRouter");
const admB2cWalletsRouter = require("./global/admB2cWalletsRouter");

const admB2bSpecialMarkupRouter = require("./global/admB2bSpecialMarkupRouter");
const admApiMasterRouter = require("./settings/admApiMasterRouter");
const admRefundRouter = require("./global/admRefundRouter");
const admA2aRouter = require("./a2a/admA2aRouter");
const admA2aTicketRouter = require("./a2a/admA2aTicketRouter");
const admStatesRouter = require("./global/admStatesRouter");
const admCitiesRouter = require("./global/admCitiesRouter");
const admA2aOrderRouter = require("./a2a/admA2aOrderRouter");
const admA2aMarkupRouter = require("./a2a/admA2aMarkupRouter");
const admB2bProfileRouter = require("./global/admProfileRouter");
const admB2bSingleProfileRouter = require("./global/admSingleProfileRouter");
const admA2aQuotaRouter = require("./a2a/admA2AQuotaRouter");
const admRoleRouter = require("./global/admRoleRouter");
const admAreaRouter = require("./global/admAreaRouter");
const admMarketsRouter = require("./global/admMarketsRouter");
const b2bGlobalConfigurationsRouter = require("./global/b2bGlobalConfigurationsRouter");
const admGroupAreaRouter = require("./transfers/admGroupAreaRouter");
const admB2bAccessRouter = require("./global/admB2bAccessRouter");
const admVisaEnquiryRouter = require("./visa/admVisaEnquiryRouter");
const admVisaNationalityRouter = require("./visa/admVisaNationalityRouter");
const admInsuranceRouter = require("./insurance/admInsuranceRouter");
const admAttractionReviewRouter = require("./attraction/admAttractionReviewRouter");
const admAffiliateSettingRouter = require("./affiliate/admAffiliateSettingsRouter");
const admAffiliateActivityRouter = require("./affiliate/admAffililateAcivityRouter");
const admAffiliateReportRouter = require("./affiliate/admAffiliateReportRouter");
const admAffiliateRedeemRequestRouter = require("./affiliate/admAffiliateRedeemRequestRouter");
const admMarketStrategyRouter = require("./global/admMarketStrategyRouter");
const admSeasonRouter = require("./seasons/admSeasonRouter");
const admQuotationListingRouter = require("./quotation/admQuotationResellerListingRouter");
const admAttractionCreateOrderRouter = require("./attraction/admAttractionCreateOrderRouter");
const admA2aCreateOrderRouter = require("./a2a/admCreateA2aOrderRouter");
const admVisaCreateOrderRouter = require("./visa/admCreateVisaOrderRouter");
const admAttrGuideRouter = require("./attraction/admAttrGuideRouter");
const admBannerRouter = require("./global/admBannerRouter");
const admOrderRouter = require("./orders/admOrdersRouter");
const admB2bHomeRouter = require("./global/admB2bHomeRouter");
const admCompanyAddressRouter = require("./settings/admCompanyAddressRouter");
const admB2bFrontedSettingsRouter = require("./frontend/admB2bFrontendSettingsRouter");
const admB2cFrontedSettingsRouter = require("./frontend/admB2cFrontendSettingRouter");
const admSeoRouter = require("./seo/admSeoRouter");
const admB2bUsersGetInTouchRouter = require("./getInTouch/admGetInTouch");
const admB2BHomeSettingsRouter = require("./b2bFrontend/admB2bFrontendRouter");
const admB2cHomeSettingsRouter = require("./b2cFrontend/admB2cFrontendRouter");
const admB2bBannerRouter = require("./b2bFrontend/admB2bBannerRouter");
const admB2cBannerRouter = require("./b2cFrontend/admB2cBannerRouter");
const admB2cMarkupProfileRouter = require("./global/admB2cMarkupRouter");
const admWhatsappServicesRouter = require("./settings/admWhatsappRouter");
const admWhatsappManagementRouter = require("./settings/admWhatsappManagementRouter");
const admNotitificationRouter = require("./notification/admNotificationRouter");
const admOrderDashboardRouter = require("./dashboard/admDashboardRouter");
// const admEmailConfigRouter = require("./global/admEmailConfigRouter");
const admPromoCodeRouter = require("./global/admPromoCodeRouter");
const admVendorRouter = require("./global/admVendorRouter");
const admEmailReceiverConfigRouter = require("./global/admEmailReceiverConfigRouter");
const admAccountGroupRouter = require("./accounts/admAccountGroupRouter");
const admAccountHeadRouter = require("./accounts/admAccountHeadRouter");
const admAccountNatureRouter = require("./accounts/admAccountNatureRouter");
const admAccountGlCodeRouter = require("./accounts/admAccountGlCodeRouter");
//email

const admEmailListRouter = require("./email/admEmailListRouter");
const admEmailTemplateRouter = require("./email/admEmailTemplateRouter");
const admEmailCampaignRouter = require("./email/admEmailCampaignRouter");
const admEmailImageRouter = require("./email/admEmailImageRouter");
const admEmailCampaignGroupRouter = require("./email/admEmailCampaignGroupRouter");
const admEmailUnSubscriberRouter = require("./email/admEmailUnsubscribersRouter");
const admEmailFooterRouter = require("./email/admEmailFooterRouter");
const admEmailConfigRouter = require("./email/admEmailConfigRouter");

module.exports = {
    admHomeRouter,
    admBlogsRouter,
    admSubscribersRouter,
    admBlogCategoriesRouter,
    admCountriesRouter,
    admDestinationsRouter,
    admGeneralRouter,
    admOrderDashboardRouter,
    admUsersRouter,
    admDriversRouter,
    admCurrenciesRouter,
    admResellersRouter,
    admEmailServicesRouter,
    admEmailsRouter,
    admTransactionsRouter,
    admPaymentServicesRouter,
    admEmailSettingsRouter,
    admOtpSettingsRouter,
    admB2bWalletsRouter,
    admB2cWalletsRouter,
    admB2bSpecialMarkupRouter,
    admApiMasterRouter,
    admRefundRouter,
    admA2aRouter,
    admA2aTicketRouter,
    admStatesRouter,
    admCitiesRouter,
    admA2aOrderRouter,
    admA2aMarkupRouter,
    admB2bProfileRouter,
    admB2bSingleProfileRouter,
    admA2aQuotaRouter,
    admRoleRouter,
    admAreaRouter,
    admMarketsRouter,
    b2bGlobalConfigurationsRouter,
    admGroupAreaRouter,
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
    admB2BHomeSettingsRouter,
    admB2cHomeSettingsRouter,
    admB2bBannerRouter,
    admB2cBannerRouter,
    admB2cMarkupProfileRouter,
    admWhatsappServicesRouter,
    admWhatsappManagementRouter,
    admNotitificationRouter,
    admDashboardRouter,
    admPromoCodeRouter,
    admVendorRouter,
    admEmailReceiverConfigRouter,
    admAccountGroupRouter,
    admAccountHeadRouter,
    admAccountNatureRouter,
    admAccountGlCodeRouter,

    //email
    admEmailListRouter,
    admEmailTemplateRouter,
    admEmailCampaignRouter,
    admEmailImageRouter,
    admEmailCampaignGroupRouter,
    admEmailUnSubscriberRouter,
    admEmailFooterRouter,
    admEmailConfigRouter,
};
