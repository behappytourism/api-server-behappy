const router = require("express").Router();

const {
    addContractProvider,
    deleteContractProvider,
    getAllContractProviders,
    updateContractProvider,
} = require("../../controllers/hotel/admContractProvidersController");

router.post("/add", addContractProvider);
router.patch("/update/:id", updateContractProvider);
router.delete("/delete/:id", deleteContractProvider);
router.get("/all", getAllContractProviders);

module.exports = router;
