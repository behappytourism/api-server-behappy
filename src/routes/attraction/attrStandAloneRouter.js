const router = require("express").Router();

const {
    getSingleStandAloneDetails,
    getAllStandAlone,
} = require("../../controllers/attraction/attrStandaloneController");

router.get("/single-details/:slug", getSingleStandAloneDetails);
router.get("/all", getAllStandAlone);

module.exports = router;
