const router = require("express").Router();

const {
    addNewContract,
    deleteContract,
    getSingleHotelContracts,
    updateContract,
    getSingleContract,
    cloneExistingContract,
    approveHotelContract,
    getSingleContractGroupsContracts,
    changeHotelContractGroup,
    downloadHotelContractsAsXlsx,
} = require("../../controllers/hotel/admHotelContractsController");
const { adminAuth } = require("../../middlewares");
const checkPermission = require("../../middlewares/checkPermission");

router.post("/add", adminAuth, addNewContract);
router.post("/clone/:contractId", adminAuth, cloneExistingContract);
router.delete("/delete/:id", adminAuth, deleteContract);
router.get("/single/hotel/:hotelId", adminAuth, getSingleHotelContracts);
router.get("/single/:id", adminAuth, getSingleContract);
router.get("/contract-group/:contractGroupId", adminAuth, getSingleContractGroupsContracts);
router.patch("/update/:id", adminAuth, updateContract);
router.patch("/approve/:id", checkPermission("contracts", "approve"), approveHotelContract);
router.patch("/contract-group/update", adminAuth, changeHotelContractGroup);
router.get("/download/xlsx/:hotelId", adminAuth, downloadHotelContractsAsXlsx);

module.exports = router;
