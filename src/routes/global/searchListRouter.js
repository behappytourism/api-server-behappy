const router = require("express").Router();

const {
    searchDestinationAndAtt,
} = require("../../controllers/global/serachListController");

router.get("/list", searchDestinationAndAtt);

module.exports = router;
