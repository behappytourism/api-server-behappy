const router = require("express").Router();
const multer = require("multer");
const path = require("path");

const {
    addNewEmailImage,
    getAllEmailImage,
    updateEmailImage,
    deleteEmailImage,
    getSingleEmailImage,
    getEmailImages,
} = require("../../controllers/email/admEmailImageController");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/images/email");
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + "." + file.originalname.split(".")[1]);
    },
});

const upload = multer({
    limits: {
        fileSize: 100000000,
    },
    fileFilter: (req, file, cb) => {
        const allowed = [".jpeg", ".jpg", ".webp", ".gif", ".png"];
        const ext = path.extname(file.originalname);
        if (!allowed.includes(ext)) {
            return cb(new Error("Please upload image"));
        }
        cb(undefined, true);
    },
    storage: storage,
});
router.get("/all", getAllEmailImage);
router.get("/single/:id", getSingleEmailImage);
router.post("/add", upload.single("image"), addNewEmailImage);
router.patch("/update/:id", upload.single("image"), updateEmailImage);
router.delete("/delete/:id", deleteEmailImage);
router.get("/", getEmailImages);

module.exports = router;
