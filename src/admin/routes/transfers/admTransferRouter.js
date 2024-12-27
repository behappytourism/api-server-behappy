const router = require("express").Router();

const {
    getAllTransfers,
    getAllPlacesAndAirports,
    getSingleTransfer,
    addNewTransfer,
    updateTransfer,
    deleteTransfer,
    getAllVehicles,
} = require("../../controllers/transfers/admTransfer");

router.get("/all", getAllTransfers);
router.get("/veh/all", getAllVehicles);

router.get("/places-airports", getAllPlacesAndAirports);
router.get("/single/:id", getSingleTransfer);

router.post("/new", addNewTransfer);

router.patch("/update/:id", updateTransfer);
router.delete("/delete/:id", deleteTransfer);

module.exports = router;
