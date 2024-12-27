const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const {
    getImagesLinks,
    getAllAttractionItineraries,
    createAttractionItinerary,
    deleteAttractionItinerary,
    getSingleAttractionItinerary,
    updateAttractionItinerary,
    getSingleAttractionItineraryNonPopulated,
} = require("../../controllers/attraction/admAttractionItinerariesController");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/images/attractions-categories");
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(
            null,
            file.fieldname +
                "-" +
                uniqueSuffix +
                "." +
                file.originalname.split(".")[1]
        );
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

router.post("/uploadImages", upload.array("images"), getImagesLinks);
router.get("/all", getAllAttractionItineraries);
router.post("/add", createAttractionItinerary);
router.delete("/delete/:id", deleteAttractionItinerary);
router.get("/single/:id", getSingleAttractionItinerary);
router.get(
    "/single/:id/non-populated",
    getSingleAttractionItineraryNonPopulated
);
router.patch("/update/:id", updateAttractionItinerary);

module.exports = router;
