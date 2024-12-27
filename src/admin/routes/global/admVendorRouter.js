const router = require("express").Router();

const {
    getAllVendors,
    changeVendorStatus,
    getSingleVendorsSubagents,
    updateVendor,
    getSingleVendor,
    addNewVendor,
    addNewSubAgent,
    getSingleVendorBasicInfo,
    createVendorsExcelSheet,
    checkShortNameAvailabilty,
    updateShortNameVendor,
    getAllVendorsList,
    getSingleVendorWithDetails,
    updateVendorConfigurations,
    getSingleVendorConfigurations,
} = require("../../controllers/global/admVendorController");

router.post("/add", addNewVendor);
router.get("/all", getAllVendors);
router.get("/single/:id", getSingleVendor);
router.get("/single/:id/details", getSingleVendorWithDetails);
router.get("/single/:id/configurations", getSingleVendorConfigurations);
router.patch("/update/:id/configurations", updateVendorConfigurations);

router.patch("/update/:id", updateVendor);
router.get("/all-excelSheet", createVendorsExcelSheet);
router.get("/availability/shortName/:id", checkShortNameAvailabilty);
router.patch("/update/shotName/:id", updateShortNameVendor);
router.get("/all/list", getAllVendorsList);

module.exports = router;
