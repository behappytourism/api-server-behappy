const router = require("express").Router();
const multer = require("multer");
const path = require("path");

const {
    addNewHotel,
    deleteHotel,
    getAllHotels,
    updateHotel,
    uploadBulkHotels,
    getHotelInitialData,
    getSingleHotel,
    getSingleHotelsRoomTypesAndBoardTypes,
    getPromotionInitialData,
    getContractInitialData,
    getSingleHotelsRoomTypesAndContractGroups,
    getAllHotelsWithRoomTypesAndContractGroups,
    getSingleHotelInfo,
    getHotelComparisonList,
    getHotelComparisonListExcelSheet,
    clearHotelCache,
    downloadHotelsListAsExcel,
    getAllHotelsNamesWithAddress,
    getSingleCityHotelsWithRoomTypesAndBoardTypes,
} = require("../../controllers/hotel/admHotelsController");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "public/images/hotels");
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
});

router.post("/add", upload.array("images"), addNewHotel);
router.post("/upload", uploadBulkHotels);
router.patch("/update/:id", upload.array("images"), updateHotel);
router.delete("/delete/:id", deleteHotel);
router.get("/all", getAllHotels);
router.get("/all/names", getAllHotelsNamesWithAddress);
router.get("/all/room-and-contract-group", getAllHotelsWithRoomTypesAndContractGroups);
router.get("/initial-data", getHotelInitialData);
router.get("/single/:id", getSingleHotel);
router.get("/board-and-room/city/:cityId", getSingleCityHotelsWithRoomTypesAndBoardTypes);
router.get("/board-and-room/:hotelId", getSingleHotelsRoomTypesAndBoardTypes);
router.get("/room-and-contract-group/:hotelId", getSingleHotelsRoomTypesAndContractGroups);
router.post("/contract-data", getContractInitialData);
router.get("/promotion-data/:hotelId", getPromotionInitialData);
router.get("/info/:id", getSingleHotelInfo);
router.get("/comparison-list", getHotelComparisonList);
router.get("/comparison-list/excel", getHotelComparisonListExcelSheet);
router.get("/clear-cache", clearHotelCache);
router.get("/all/excel", downloadHotelsListAsExcel);

module.exports = router;
