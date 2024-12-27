const router = require("express").Router();

const {
    getSingleStandAloneDetails,
} = require("../../controllers/attraction/attrStandaloneController");

router.get("/single-details/:slug", getSingleStandAloneDetails);

module.exports = router;
