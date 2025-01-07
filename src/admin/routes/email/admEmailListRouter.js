const router = require("express").Router();
const multer = require("multer");
const path = require("path");

const {
    addNewEmailList,
    getAllEmailList,
    updateEmailList,
    deleteEmailList,
    getSingleEmailList,
    getEmailLists,
    downloadEmailList,
    getEmailList,
} = require("../../controllers/email/admEmailLisitngController");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/csv/email");
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
        const allowed = [".csv"];
        const ext = path.extname(file.originalname);
        if (!allowed.includes(ext)) {
            return cb(new Error("Please upload csv"));
        }
        cb(undefined, true);
    },
    storage: storage,
});
router.get("/all", getAllEmailList);
router.get("/single/:id", getSingleEmailList);
router.post("/add", upload.single("filePath"), addNewEmailList);
router.patch("/update/:id", upload.single("filePath"), updateEmailList);
router.delete("/delete/:id", deleteEmailList);
router.get("/", getEmailLists);
router.get("/download/:id", downloadEmailList);
router.get("/emails/:id", getEmailList);

module.exports = router;
