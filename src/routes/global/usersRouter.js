const router = require("express").Router();
const multer = require("multer");
const path = require("path");

const {
    doSignup,
    doLogin,
    emailSignup,
    getAccount,
    updateUser,
    updatePassword,
    forgetPassword,
    completeForgetPassword,
    deleteAccount,
    addFinancialData,
    updateFinancialData,
    getSingleUserFinacialData,
    iosSignup,
} = require("../../controllers/global/usersController");
const userAuth = require("../../middlewares/userAuth");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/images/users");
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

router.post("/signup", doSignup);
router.post("/login", doLogin);
router.get("/my-account", userAuth, getAccount);
router.patch("/update", userAuth, upload.single("avatar"), updateUser);
router.patch("/update/password", userAuth, updatePassword);
router.patch("/forget-password", forgetPassword);
router.patch("/complete/forget-password", completeForgetPassword);
router.delete("/delete", userAuth, deleteAccount);
router.post("/emailLogin", emailSignup);
router.post("/ios-login", iosSignup);

module.exports = router;
