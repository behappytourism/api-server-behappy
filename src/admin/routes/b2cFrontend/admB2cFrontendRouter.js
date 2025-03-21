const router = require("express").Router();
const multer = require("multer");
const path = require("path");

const {
    addHomeHeros,
    updateHomeFooter,
    deleteHomeCard,
    addHomeCard,
    updateHomeLogo,
    updateMetaDetails,
    updateHomeSections,
    getLogo,
    getAllCards,
    getMetaDetails,
    getFooter,
    getHeros,
    updateHomeHero,
    deleteHomeHero,
    updateHomeCard,
    getSingleCard,
    getSections,
    addNewHomeSection,
    editHomeSection,
    listAllSections,
    deleteSection,
    addNewBanner,
    editBanner,
    listAllSectionBanners,
    deleteBannerSection,
    upsertB2bSettings,
    getFrontendSettings,
    getAboutUs,
    upsertAboutUs,
    addHomeReviews,
    updateHomeReviews,
    getReviews,
    deleteHomeReviews,
} = require("../../controllers/b2cFrontend/b2cFrontendHomeSettingsRouter");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/images/home");
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + "." + file.originalname.split(".")[1]);
    },
});

const upload = multer({
    limits: {
        fileSize: 2000000,
    },
    fileFilter: (req, file, cb) => {
        const allowed = [".jpg", ".jpeg", ".png", ".webp"];
        const ext = path.extname(file.originalname);
        if (!allowed.includes(ext)) {
            return cb(new Error("Please upload jpg, jpeg, webp, or png"));
        }
        cb(undefined, true);
    },
    storage: storage,
});

const multipleUplaod = upload.fields([
    { name: "backgroundImage", maxCount: 1 },
    { name: "icon", maxCount: 1 },
]);

router.post("/heros/add", upload.single("image"), addHomeHeros);
router.post("/cards/add", multipleUplaod, addHomeCard);
router.post("/reviews/add", upload.single("image"), addHomeReviews);

router.patch("/logo/update", upload.single("logo"), updateHomeLogo);
router.patch("/meta/update", updateMetaDetails);
router.patch("/sections/update", updateHomeSections);
router.patch("/footer/update", updateHomeFooter);
router.patch("/heros/update/:heroId", upload.single("image"), updateHomeHero);
router.patch("/cards/update/:cardId", multipleUplaod, updateHomeCard);
router.patch("/reviews/update/:reviewId", upload.single("image"), updateHomeReviews);

router.delete("/cards/delete/:cardId", deleteHomeCard);
router.delete("/heros/delete/:heroId", deleteHomeHero);
router.delete("/reviews/delete/:reviewId", deleteHomeReviews);

router.get("/logo", getLogo);
router.get("/cards", getAllCards);
router.get("/meta-details", getMetaDetails);
router.get("/footer", getFooter);
router.get("/heros", getHeros);
router.get("/reviews", getReviews);

router.get("/cards/:cardId", getSingleCard);
router.get("/sections", getSections);

router.post("/section/add", addNewHomeSection);
router.patch("/section/edit/:id", editHomeSection);
router.get("/section/all", listAllSections);
router.delete("/section/delete/:id", deleteSection);

router.post("/banner/add/:id", upload.single("image"), addNewBanner);
router.patch("/banner/edit/:id/:bannerId", upload.single("image"), editBanner);
router.get("/banner/all/:id", listAllSectionBanners);
router.delete("/banner/delete/:id/:bannerId", deleteBannerSection);

router.patch("/terms-and-conditions/upsert", upsertB2bSettings);
router.get("/terms-and-conditions", getFrontendSettings);

router.patch("/about-us/upsert", upsertAboutUs);
router.get("/about-us", getAboutUs);
module.exports = router;
