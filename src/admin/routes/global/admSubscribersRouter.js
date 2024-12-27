const router = require("express").Router();

const {
    getAllSubscribers,
} = require("../../controllers/global/admSubscribersController");

router.get("/all", getAllSubscribers);

module.exports = router;
