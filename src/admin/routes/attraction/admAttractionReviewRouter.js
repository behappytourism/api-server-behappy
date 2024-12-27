const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const {
    addAttractionReview,
    deleteAttractionReview,
    getSingleAttractionReviews,
    getSingleReview,
    editAttractionReview,
} = require("../../controllers/attraction/admAttractionReviewController");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/images/reviews/user");
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

router.post("/add", upload.single("image"), addAttractionReview);
router.patch("/:reviewId/update", upload.single("image"), editAttractionReview);
router.delete("/delete/:reviewId", deleteAttractionReview);
router.get("/attraction/:id", getSingleAttractionReviews);
router.get("/single/:reviewId", getSingleReview);
module.exports = router;
