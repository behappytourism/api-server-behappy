const homeRouter = require("./global/homeRouter");
const usersRouter = require("./global/usersRouter");
const attractionsRouter = require("./attraction/attractionsRouter");
const subscribersRouter = require("./global/subscribersRouter");
const attractionReviewsRouter = require("./attraction/attractionReviewsRouter");
const countriesRouter = require("./global/countriesRouter");
const blogsRouter = require("./blog/blogsRouter");
const attractionsCategoriesRouter = require("./attraction/attractionsCategoriesRouter");
const attractionsOrdersRouter = require("./attraction/attractionsOrdersRouter");
const visaApplicationRouter = require("./visa/visaApplicationRouter");
const visaListRouter = require("./visa/visaListRouter");
const searchListRouter = require("./global/searchListRouter");
const visaEnquiryRouter = require("./visa/visaEnquiryRouter");
const affiliateRouter = require("./affiliate/affiliateRouter");
const affiliateRedeemRouter = require("./affiliate/affiliateRedeemRouter");
const hotelAvailabilitiesRouter = require("./hotel/hotelAvailabilitiesRouter");
const hotelOrdersRouter = require("./hotel/hotelOrdersRouter");
const hotelsRouter = require("./hotel/hotelsRouter");
const seoRouter = require("./seo/seoRouter");
const b2cOrderRouter = require("./orders/b2cOrderRouter");
const transferRouter = require("./transfer/transferAvailabilityRouter");
const attrStandAloneRouter = require("./attraction/attrStandAloneRouter");
const b2cFrontendRouter = require("./global/b2cFrontendRouter");
const b2cTransferOrderRouter = require("./transfer/transferOrderRouter");
module.exports = {
    homeRouter,
    usersRouter,
    attractionsRouter,
    subscribersRouter,
    attractionReviewsRouter,
    countriesRouter,
    blogsRouter,
    attractionsCategoriesRouter,
    attractionsOrdersRouter,
    visaApplicationRouter,
    visaListRouter,
    searchListRouter,
    visaEnquiryRouter,
    affiliateRouter,
    affiliateRedeemRouter,
    hotelAvailabilitiesRouter,
    hotelsRouter,
    hotelOrdersRouter,
    seoRouter,
    b2cOrderRouter,
    transferRouter,
    attrStandAloneRouter,
    b2cFrontendRouter,
    b2cTransferOrderRouter,
};
