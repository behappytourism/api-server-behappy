const router = require("express").Router();
const multer = require("multer");
const path = require("path");

const {
    resellerRegister,
    resellerLogin,
    updateCompanySettings,
    updatePassword,
    updateProfileSetting,
    getReseller,
    deleteAccount,
    getCertificateDetails,
    updateCertifcations,
} = require("../../controllers/global/b2bResellersAuthController");
const { b2bAuth } = require("../../middlewares");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/images/b2b");
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

const uploadCertificate = multer({
    limits: {
        fileSize: 20000000,
    },
    fileFilter: (req, file, cb) => {
        const allowed = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
        const ext = path.extname(file.originalname);
        if (!allowed.includes(ext)) {
            return cb(new Error("Please upload jpg, jpeg, webp, png or pdf"));
        }
        cb(undefined, true);
    },
    storage: storage,
}).fields([
    { name: "tradeLicense", maxCount: 8 },
    { name: "taxCertificate", maxCount: 1 },
]);

router.post("/signup", resellerRegister);
router.post("/login", resellerLogin);
router.patch("/update/profileSetings", b2bAuth, upload.single("image"), updateProfileSetting);
router.patch(
    "/update/comapnySettings",
    b2bAuth,
    upload.single("companyLogo"),
    updateCompanySettings
);
router.patch("/update/password", b2bAuth, updatePassword);
router.get("/getReseller", b2bAuth, getReseller);
router.delete("/delete", b2bAuth, deleteAccount);
router.patch(
    "/update/certificate/:agentCode/:randomString",
    uploadCertificate,
    updateCertifcations
);
router.get("/certificate/:agentCode/:randomString", getCertificateDetails);
module.exports = router;
