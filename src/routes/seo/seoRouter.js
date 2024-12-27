const router = require("express").Router();

const { seoSearch } = require("../../controllers/seo/seoController");

router.get("/search", seoSearch);

module.exports = router;
