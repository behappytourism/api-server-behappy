const router = require("express").Router();
const multer = require("multer");
const path = require("path");

const {
    addNewHomeSection,
    editHomeSection,
    listAllSections,
    addNewBanner,
    editBanner,
    listAllSectionBanners,
    deleteBannerSection,
    deleteSection,
} = require("../../controllers/global/admB2bHomeController");
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/images/b2b-home-banner");
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
router.post("/section/add", addNewHomeSection);
router.patch("/section/edit/:id", editHomeSection);
router.get("/section/all", listAllSections);
router.delete("/section/delete/:id", deleteSection);

router.post("/banner/add/:id", upload.single("image"), addNewBanner);
router.patch("/banner/edit/:id/:bannerId", upload.single("image"), editBanner);
router.get("/banner/all/:id", listAllSectionBanners);
router.delete("/banner/delete/:id/:bannerId", deleteBannerSection);

module.exports = router;
