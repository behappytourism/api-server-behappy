const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const {
    addBanner,
    getAllBannerNames,
    getSingleBanner,
    addSingleBanner,
    editSingleBanner,
    deleteBanner,
} = require("../../controllers/b2bFrontend/admB2bBannerController");
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/images/banners");
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

router.post("/add", addBanner);
// router.delete("/delete/:id", deleteArea);
router.get("/all", getAllBannerNames);
router.get("/single/:id", getSingleBanner);
router.patch("/add/single/:id", (req, res) => {
    upload.single("image")(req, res, (err) => {
        if (err) {
            return res
                .status(err.statusCode || 400)
                .json({ error: err.message, status: err.status || 400 });
        }
        addSingleBanner(req, res);
    });
});

router.patch("/edit/single/:id/:bannerId", (req, res) => {
    upload.single("image")(req, res, (err) => {
        if (err) {
            return res
                .status(err.statusCode || 400)
                .json({ error: err.message, status: err.status || 400 });
        }
        editSingleBanner(req, res);
    });
});
router.delete("/delete/:id/:bannerId", deleteBanner);

module.exports = router;
