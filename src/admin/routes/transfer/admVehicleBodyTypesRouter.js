const router = require("express").Router();
const multer = require("multer");
const path = require("path");

const {
    addNewVehicleBodyType,
    deleteVehicleBodyType,
    getAllVehicleBodyTypes,
    updateVehicleBodyType,
    getAllBodyTypesNames,
} = require("../../controllers/transfer/admVehicleBodyTypesController");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/images/transfer");
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

router.post("/add", upload.single("bodyImg"), addNewVehicleBodyType);
router.patch("/update/:id", upload.single("bodyImg"), updateVehicleBodyType);
router.delete("/delete/:id", deleteVehicleBodyType);
router.get("/all", getAllVehicleBodyTypes);
router.get("/all/names", getAllBodyTypesNames);

module.exports = router;
