const router = require("express").Router();
const multer = require("multer");
const path = require("path");

const {
    addNewEmailTemplate,
    getAllEmailTemplate,
    updateEmailTemplate,
    deleteEmailTemplate,
    getSingleEmailTemplate,
    getEmailTemplateLists,
} = require("../../controllers/email/admEmailTemplateController");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/html/email");
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
        const allowed = [".html", ".ejs"];
        const ext = path.extname(file.originalname);
        if (!allowed.includes(ext)) {
            return cb(new Error("Please upload html"));
        }
        cb(undefined, true);
    },
    storage: storage,
});

router.get("/all", getAllEmailTemplate);
router.get("/single/:id", getSingleEmailTemplate);
router.post("/add", upload.single("filePath"), addNewEmailTemplate);
router.patch("/update/:id", upload.single("filePath"), updateEmailTemplate);
router.delete("/delete/:id", deleteEmailTemplate);
router.get("/", getEmailTemplateLists);

module.exports = router;
