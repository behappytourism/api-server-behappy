const router = require("express").Router();
const path = require("path");
const multer = require("multer");

const {
    addVisaNationality,
    getAllVisaNationality,
    updateNationality,
    deleteNationality,
    getAllNationalityVisaTypes,
    addVisaTypeNationality,
    updateVisaTypeNationality,
    getAllVisaTypes,
    deleteVisaTypeNationality,
    getSelectedVisaType,
} = require("../../controllers/visa/admVisaNationalityController");

router.post("/add", addVisaNationality);
router.get("/all", getAllVisaNationality);
router.delete("/delete/:id", deleteNationality);

//visa types

router.get("/visa-types/:id/:createdFor", getAllNationalityVisaTypes);
router.patch("/add", addVisaTypeNationality);
router.patch("/update", updateVisaTypeNationality);
router.delete("/delete/:nationalityId/visa-type/:visaTypeId", deleteVisaTypeNationality);
router.get("/visa-type/list", getAllVisaTypes);
router.get("/:nationalityId/visa-type/:visaId/:createdFor", getSelectedVisaType);

module.exports = router;
