const router = require("express").Router();
const multer = require("multer");
const path = require("path");
const {
    addNotification,
    listAllNotification,
    getSingleNotification,
    updateNotification,
    deleteNotification,
    pushNotification,
} = require("../../controllers/notification/admNotificationController");
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/images/notification");
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

router.post("/add", upload.single("image"), addNotification);
router.get("/all", listAllNotification);
router.get("/single/:id", getSingleNotification);
router.patch("/update/:id", upload.single("image"), updateNotification);
router.delete("/delete/:id", deleteNotification);
router.get("/push/:id", pushNotification);

module.exports = router;
