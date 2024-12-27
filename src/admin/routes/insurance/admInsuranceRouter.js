const router = require("express").Router();

const {
    getAllInsurancePlans,
    getAllB2bInsuranceContracts,
    getSingleB2bInsuranceContractDetails,
} = require("../../controllers/insurance/admInsuranceController");

router.get("/plans/all", getAllInsurancePlans);
router.get("/contracts/all", getAllB2bInsuranceContracts);
router.get("/contracts/single/:contractId", getSingleB2bInsuranceContractDetails);

module.exports = router;
