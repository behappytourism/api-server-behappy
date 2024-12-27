const router = require("express").Router();

const {
    addNewCompanyAddress,
    updateCompanyAddress,
    deleteCompanyAddress,
    getAllCompanyAddresses,
    getSingleCompanyAddress,
} = require("../../controllers/settings/admCompanyAddressController");

router.post("/add", addNewCompanyAddress);
router.patch("/update/:id", updateCompanyAddress);
router.delete("/delete/:id", deleteCompanyAddress);
router.get("/all", getAllCompanyAddresses);
router.get("/single/:id", getSingleCompanyAddress);

module.exports = router;
