const router = require("express").Router();
const multer = require("multer");
const path = require("path");

const {
    addNewTourPackage,
    updateTourPackage,
    getTourPackageInitialData,
    getAllTourPackages,
    deleteTourPackage,
    getSingleTourPackage,
} = require("../../controllers/tourPackage/admTourPackagesController");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/images/tour-packages");
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + "." + file.originalname.split(".")[1]);
    },
});

const upload = multer({
    limits: {
        fileSize: 20000000,
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
}).fields([{ name: "thumbnailImg", maxCount: 8 }]);

router.post("/add", upload, addNewTourPackage);
router.patch("/update/:id", upload, updateTourPackage);
router.get("/initial-data", getTourPackageInitialData);
router.get("/all", getAllTourPackages);
router.get("/single/:id", getSingleTourPackage);
router.delete("/delete/:id", deleteTourPackage);

module.exports = router;
