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
        const allowed = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
        const ext = path.extname(file.originalname);
        if (!allowed.includes(ext)) {
            return cb(new Error("Please upload jpg, jpeg, webp, pdf , or png"));
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
    capturePayalVisaApplication,
    captureCCAvenueAttractionPayment,
    captureRazorpayAttractionPayment,
    singleVisaApplication,
    visaApplicationList,
    visaApplicationInvoice,
    applyVisa,
    initiatePayment,
    completeVisaDocumentOrder,
    completeVisaReapplyDocumentOrder,
    visaCompleteOrderDetails,
    completeAllDocumentUpload,
    downloadVisaInvoice,
} = require("../../controllers/visa/visaController");
const { userAuthOrNot, userAuth } = require("../../middlewares");

router.post("/create", userAuthOrNot, applyVisa);
router.post("/initiate/:orderId", initiatePayment);
router.post("/capture/paypal/:orderId", capturePayalVisaApplication);
router.post("/ccavenue/capture", captureCCAvenueAttractionPayment);
router.post("/razorpay/capture", captureRazorpayAttractionPayment);
router.get("/details/:orderId", visaCompleteOrderDetails);
router.post("/document/:orderId/:travellerId", (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            return res
                .status(err.statusCode || 400)
                .json({ error: err.message, status: err.status || 400 });
        }
        completeVisaDocumentOrder(req, res);
    });
});

router.get("/complete/:orderId", completeAllDocumentUpload);

router.get("/invoice/:orderId", visaApplicationInvoice);
router.get("/download/invoice/:orderId", downloadVisaInvoice);
router.get("/list", userAuth, visaApplicationList);
router.post("/:orderId/reapply/:travellerId", userAuth, upload, completeVisaReapplyDocumentOrder);
router.get("/:orderId/single/:travellerId", userAuth, singleVisaApplication);

module.exports = router;
