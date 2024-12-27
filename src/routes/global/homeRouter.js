const router = require("express").Router();

const {
    getHomeData,
    getInitialData,
    getContactDetails,
    contactUsMessage,
    getHomeBannaers,
    getAboutUs,
} = require("../../controllers/global/homeControllers");

router.get("/", getHomeData);
router.get("/initial-data", getInitialData);
router.get("/contact-details", getContactDetails);
router.post("/contact-us", contactUsMessage);
router.get("/banners", getHomeBannaers);
router.get("/about-us", getAboutUs);

module.exports = router;
