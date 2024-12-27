const router = require("express").Router();
const multer = require("multer");
const path = require("path");

const {
    addNewAdmin,
    adminLogin,
    deleteAdmin,
    getAllAdmins,
    getAdmin,
    updateAdminDetails,
    updateAdminPassword,
    getSingleAdmin,
    updateSingleAdmin,
    addQtnAdminsFromCsv,
} = require("../../controllers/auth/admAuthController");
const adminAuth = require("../../middlewares/adminAuth");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/images/admins");
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

const csvUpload = multer({
    limits: {
        fileSize: 2000000,
    },
    fileFilter: (req, file, cb) => {
        const allowed = [".csv"];
        const ext = path.extname(file.originalname);
        if (!allowed.includes(ext)) {
            return cb(new Error("Please upload csv"));
        }
        cb(undefined, true);
    },
    storage: storage,
});

router.post("/add", adminAuth, upload.single("avatar"), addNewAdmin);
router.post("/login", adminLogin);
// router.post("/upload-qtn-admins", adminAuth, csvUpload.single("admins"), addQtnAdminsFromCsv);

router.patch("/update", adminAuth, upload.single("avatar"), updateAdminDetails);
router.patch("/update/password", adminAuth, updateAdminPassword);
router.patch("/update/single/:id", adminAuth, upload.single("avatar"), updateSingleAdmin);

router.get("/all", adminAuth, getAllAdmins);
router.get("/single/:id", adminAuth, getSingleAdmin);
router.get("/my-account", adminAuth, getAdmin);

router.delete("/delete/:id", adminAuth, deleteAdmin);

module.exports = router;
