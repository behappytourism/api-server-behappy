const {
    addSeoMain,
    addSubCategory,
    addCategory,
    getMainCategories,
    getCategories,
    getSubCategoryProducts,
    getSeoAttractions,
    updateSubCategory,
    getSeoDestination,
    getSeoVisaNatinality,
    updateCategory,
    getSeoTours,
    getStandAlone,
    getBlogList,
    getBlogCategory,
    updateImageAttraction,
} = require("../../controllers/seo/admSeoController");
const multer = require("multer");
const path = require("path");
const router = require("express").Router();

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/images/seo");
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
router.post("/add", addSeoMain);
router.post("/category/add", upload.single("image"), addCategory);
router.post("/subcategory/add", upload.single("image"), addSubCategory);
router.patch("/subcategory/update", upload.single("image"), updateSubCategory);
router.patch("/category/update", upload.single("image"), updateCategory);

router.get("/main-categories", getMainCategories);
router.get("/categories/:id", getCategories);
router.get("/sub-categories/:id/:categoryId", getCategories);
router.get("/sub-categories/:id/:categoryId/:subCategoryId", getSubCategoryProducts);
router.get("/attraction", getSeoAttractions);
router.get("/destination", getSeoDestination);
router.get("/visa", getSeoVisaNatinality);
router.get("/tours", getSeoTours);
router.get("/stand-alone", getStandAlone);
router.get("/blog-list", getBlogList);
router.get("/blog-category", getBlogCategory);
router.get("/update-category", updateImageAttraction);

module.exports = router;
