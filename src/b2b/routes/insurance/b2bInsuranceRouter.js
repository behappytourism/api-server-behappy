const router = require("express").Router();

const {
    getAllPlans,
    createInsuranceQuotation,
    initateContract,
    createContract,
    downloadContract,
    getAllInsuranceContracts,
    getSingleInsuranceContractDetails,
} = require("../../controllers/insurance/b2bInsuranceController");
const { b2bAuth } = require("../../middlewares");

router.get("/all", b2bAuth, getAllPlans);
router.post("/quotation", b2bAuth, createInsuranceQuotation);
router.post("/initiate-contract", b2bAuth, initateContract);

router.post("/create-contract", b2bAuth, createContract);
router.get("/download-contract/:orderId", b2bAuth, downloadContract);
router.get("/contracts/all", b2bAuth, getAllInsuranceContracts);
router.get("/contracts/single/:contractId", b2bAuth, getSingleInsuranceContractDetails);

module.exports = router;
