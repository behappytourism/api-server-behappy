const router = require("express").Router();

const{upsertB2bA2aMarkup} = require('../../controllers/a2a/admA2aMarkupController')

router.patch("/add", upsertB2bA2aMarkup);


module.exports = router;