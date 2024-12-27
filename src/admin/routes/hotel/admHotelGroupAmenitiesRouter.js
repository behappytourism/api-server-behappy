const router = require("express").Router();
const multer = require("multer");
const path = require("path");

const {
    addNewHotelAmenityGroup,
    deleteHotelAmenityGroup,
    getAllHotelGroupAmenities,
    getAllSubAmenities,
    updateHotelAmenityGroup,
} = require("../../controllers/hotel/admHotelGroupAmenitiesController");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/images/hotel-facilities");
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

router.post("/add", upload.single("icon"), addNewHotelAmenityGroup);
router.patch("/update/:id", upload.single("icon"), updateHotelAmenityGroup);
router.delete("/delete/:id", deleteHotelAmenityGroup);
router.get("/all", getAllHotelGroupAmenities);
router.get("/:id/all", getAllSubAmenities);

module.exports = router;
