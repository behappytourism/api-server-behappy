const router = require("express").Router();
const multer = require("multer");
const path = require("path");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/images/visadocuments");
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
}).fields([
    { name: "passportFistPagePhoto", maxCount: 8 },
    { name: "passportLastPagePhoto", maxCount: 8 },
    { name: "passportSizePhoto", maxCount: 8 },
    { name: "supportiveDoc1", maxCount: 8 },
    { name: "supportiveDoc2", maxCount: 8 },
]);

const {
    listVisaType,
    listAllCountry,
    listAllNationality,
    listAll,
    applyVisa,
    completeVisaPaymentOrder,
    completeVisaDocumentOrder,
    getSingleVisaOrderDetails,
} = require("../../controllers/visa/admCreateVisaOrderController");

router.get("/country/all", listAllCountry);
router.get("/all/nationality", listAllNationality);
router.get("/type/:visaId/all/:nationalityId/:resellerId", listVisaType);
router.get("/single/:orderId", getSingleVisaOrderDetails);

router.post("/create/:resellerId", applyVisa);
router.post("/payment/:orderId", completeVisaPaymentOrder);
router.post("/document/:orderId", upload, completeVisaDocumentOrder);
module.exports = router;
