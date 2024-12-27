const B2bHomeSettings = require("./settings/b2bHomeSettings.model");
const B2cHomeSettings = require("./settings/b2cHomeSettings.model");
const Subscriber = require("./global/subscriber.model");

// Attraction models
const AttractionCategory = require("./attraction/attractionCategory.model");
const Attraction = require("./attraction/attraction.model");
const AttractionActivity = require("./attraction/attractionActivity.model");
const AttractionOrder = require("./attraction/attractionOrder.model");
const B2CAttractionMarkup = require("./attraction/b2cAttractionMarkup.model");
const AttractionStandAlone = require("./attraction/attractionStandAlone.model");

const Blog = require("./blog/blog.model");
const BlogCategory = require("./blog/blogCategory.model");
const User = require("./global/user.model");
const Visa = require("./visa/visa.model");
const VisaType = require("./visa/visaType.model");
const Coupon = require("./global/coupon.model");
const AttractionTicket = require("./attraction/attractionTicket.model");
const Country = require("./global/country.model");
const Destination = require("./attraction/destination.model");
const VisaApplication = require("./visa/visaApplication.model");
const VisaDocument = require("./visa/visaDocument.model");
const AttractionReview = require("./attraction/attractionReview.model");
const Currency = require("./global/currency.modal");
const Driver = require("./global/driver.model");
const B2CTransaction = require("./global/b2cTransaction.model");
const B2CWallet = require("./global/b2cWallet.model");
const PaymentService = require("./settings/paymentService.model");
const OtpSettings = require("./settings/otpSettings.model");
const EmailSettings = require("./settings/emailSettings.model");
const B2CVisaApplication = require("./visa/b2cVisaApplication.model");
const ApiMaster = require("./settings/apiMaster.model");
const Airport = require("./flight/airport.model");
const Airline = require("./flight/airline.model");
const B2CBankDetails = require("./global/b2cBankDetails.model");
const Refund = require("./global/refund.model");
const AttractionItinerary = require("./attraction/attractionItinerary.model");
const B2cClientVisaMarkup = require("./visa/b2cVisaMarkup.Model");
const VisaEnquiry = require("./visa/visaEnquiry.model");
const VisaNationality = require("./visa/visaNationality.model");
const AttractionTicketLog = require("./attraction/attractionTicketLog.model");

//transfer
const Transfer = require("./transfer/transfer.model");
const VehicleType = require("./transfer/vehicleType.model");
const GroupArea = require("./transfer/groupArea");
const B2CTransferOrder = require("./transfer/transferOrder.model");

//quotaion
const Excursion = require("./quotation/excursion.model");
const ExcursionQuotation = require("./quotation/excursionQuotation.model");
const TransferQuotation = require("./quotation/transferQuotation.model");
const HotelQuotation = require("./quotation/hotelQuotation.model");
const QuotationAmendment = require("./quotation/quotationAmendment.model");
const Quotation = require("./quotation/quotation.model");
const ExcursionRegularPricing = require("./quotation/excursionRegularPricing.model");
const ExcursionTicketPricing = require("./quotation/excursionTicketPricing.model");
const ExcursionTransferPricing = require("./quotation/excursionTransferPricing.model");
const ExcSupplementsQuotation = require("./quotation/excSupplementsQuotation.model");
const AdminB2bAccess = require("./global/adminAccess.model");

//insurance

const InsurancePlan = require("./insurance/insurancePlan.model");
const InsurnaceContract = require("./insurance/insuranceContract.model");

//Affiliate
const AffiliateSettings = require("./affiliate/affiliateSettings.model");
const AffiliateActivity = require("./affiliate/affiliateActivity.model");
const AffiliatePointHistory = require("./affiliate/affiliatePointHistory.model");
const AffiliateClickHistory = require("./affiliate/affiliateClickHistory.model");
const AffiliateUser = require("./affiliate/affiliateUser.mode");
const AffiliateRedeem = require("./affiliate/affiliateRedeem.model");

// financial data
const FinancialUserData = require("./global/FinanciaUserlData.model");

//seasons
const Season = require("./global/season.model");

//transaction
const AccountDetail = require("./global/accountDetail.model");
const TransactionCategory = require("./global/transactionCategory.model");
const CompanyTransaction = require("./global/companyTransaction.model");
const B2CTransferOrderPayment = require("./transfer/transferOrderPayment");

//guide
const Guide = require("./attraction/guide.model");
const GuideQuotation = require("./quotation/guideQuotation.model");

//transaction
const AttractionTransaction = require("./attraction/attractionTranscation.model");
const B2bBanner = require("./global/b2bBanner.model");
const B2cBanner = require("./global/b2cBanner.model");

const AttractionTicketSetting = require("./attraction/attractionTicketSettings.model");

const BurjKhalifaLog = require("./attraction/burjkhalifaLog.model");
const CompanyAddress = require("./settings/companyAddress.model");

//frontend
const B2CFrontendSetting = require("./settings/b2cFrontendSettings.model");
const B2BFrontendSetting = require("./settings/b2bFrontendSettings.model");
const B2BHomeSection = require("./settings/b2bHomeSection.model");
const B2CHomeSection = require("./settings/b2cHomeSection.model");

// Order
const B2COrder = require("./order/b2cOrder.model");
const B2COrderPayment = require("./order/b2cOrderPayment.model");

const B2CAttractionOrderRefund = require("./attraction/b2cAttractionOrderRefund.model");
const ContactUs = require("./global/contactUs.model");
const B2cMarkupProfile = require("./global/b2cMarkupProfile.model");
const WhatsappConfig = require("./global/whatsappConfig.model");
const WhatsappManagement = require("./global/whtsappManagement.model");
const Notification = require("./notification/notification.model");
const CcavenueLog = require("./global/ccavenueLog.model");
const EmailConfig = require("./settings/emailConfig.model");
const B2cPromoCode = require("./global/b2cPromoCode.model");
const EmailReceiverConfig = require("./settings/emailReceiverConfig.model");
const B2CAttractionOrderPayment = require("./attraction/b2cAttractionOrderPayment.model");
const B2CAttractionOrderCancellation = require("./attraction/b2cAttractionOrderCancellation.model");
const B2CTransferOrderRefund = require("./transfer/b2cTransferOrderRefund.model");
const B2CTransferOrderCancellation = require("./transfer/b2cTransferOrderCancellation.model");
const B2COrderRefund = require("./order/b2OrderRefund.model");
const B2COrderCancellation = require("./order/b2cOrderCancellation.model");

//accounts
const AccountHead = require("./accounts/accountHead.model");
const AccountGroup = require("./accounts/accountGroup.model");
const AccountNature = require("./accounts/accountNature.model");
const AccountGlCode = require("./accounts/accountGlCode.model");

module.exports = {
    B2BHomeSection,
    B2CHomeSection,
    B2bHomeSettings,
    B2cHomeSettings,
    Subscriber,
    AttractionCategory,
    Attraction,
    Blog,
    BlogCategory,
    AttractionActivity,
    User,
    Visa,
    VisaType,
    Coupon,
    AttractionTicket,
    Country,
    Destination,
    AttractionOrder,
    VisaApplication,
    VisaDocument,
    AttractionReview,
    Currency,
    B2CAttractionMarkup,
    B2CAttractionMarkup,
    B2CTransaction,
    B2CWallet,
    PaymentService,
    OtpSettings,
    EmailSettings,
    B2CVisaApplication,
    ApiMaster,
    AttractionItinerary,
    Refund,
    B2CBankDetails,
    Airport,
    Airline,
    B2cClientVisaMarkup,
    User,
    Excursion,
    ExcursionQuotation,
    TransferQuotation,
    HotelQuotation,
    QuotationAmendment,
    Quotation,
    Country,
    Visa,
    ExcursionRegularPricing,
    ExcursionTicketPricing,
    ExcursionTransferPricing,
    ExcSupplementsQuotation,
    Transfer,
    VehicleType,
    GroupArea,
    AdminB2bAccess,
    VisaEnquiry,
    VisaNationality,
    InsurancePlan,
    AttractionTicketLog,
    InsurnaceContract,
    AffiliateSettings,
    AffiliateActivity,
    AffiliateClickHistory,
    AffiliatePointHistory,
    AffiliateUser,
    AffiliateRedeem,
    FinancialUserData,
    Season,
    AccountDetail,
    TransactionCategory,
    CompanyTransaction,
    Guide,
    GuideQuotation,
    AttractionTransaction,
    Driver,
    B2bBanner,
    B2cBanner,
    AttractionTicketSetting,
    BurjKhalifaLog,
    CompanyAddress,
    B2BFrontendSetting,
    B2CFrontendSetting,

    // new changes add b2c orders
    B2CTransferOrder,
    B2COrder,
    B2CTransferOrderPayment,
    B2COrderPayment,
    B2CAttractionOrderRefund,
    ContactUs,
    B2cMarkupProfile,
    AttractionStandAlone,
    WhatsappConfig,
    WhatsappManagement,
    Notification,
    CcavenueLog,
    B2CAttractionOrderPayment,
    EmailConfig,
    B2cPromoCode,
    EmailReceiverConfig,
    B2CAttractionOrderCancellation,
    B2CTransferOrderCancellation,
    B2CTransferOrderRefund,
    B2COrderCancellation,
    B2COrderRefund,

    //accounts
    AccountGroup,
    AccountNature,
    AccountHead,
    AccountGlCode,
};
