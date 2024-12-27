const router = require("express").Router();

const {
    addProfile,
    deleteProfile,
    getAllProfiles,
    getAllAttractionActivities,
    getAllVisaType,
    getAlla2aTypes,
    updateActivityProfile,
    updateVisaProfile,
    updateA2aProfile,
    getAllCategory,
    getAllHotels,
    getAllRoomTypes,
    updateRoomType,
    getQuotationDetails,
    updateQuotation,
    updateStarCategory,
    getAllAirlines,
    updateFlightProfile,
    getAllInsurancePlans,
    updateInsuranceProfile,
    getAllTransfers,
    updateTransferProfile,
    updateAttractionProfile,
    applyAdminMarketStrategy,
    applyResellerMarketStrategy,
    updateAllTransferProfile,
    updateHotelRoomType,
    cloneMarket,
    getAllTransferVehciles,
    updateSingleTransferProfile,
    getAdminSelectedProfile,
    getB2bSelectedProfile,
    getHotelMarkups,
    updateHotelMarkup,
} = require("../../controllers/global/admMarketStrategyController");

router.post("/add-profile", addProfile);
router.get("/b2b/get-selected/:resellerId", getB2bSelectedProfile);
router.get("/admin/get-selected/:resellerId", getAdminSelectedProfile);
router.post("/update-activities-profile/:id", updateActivityProfile);
router.post("/update-visa-profile/:id", updateVisaProfile);
router.post("/update-a2a-profile/:id", updateA2aProfile);
router.post("/update-starCategory-profile/:id", updateStarCategory);
router.post("/update-roomType-profile/:id", updateRoomType);
router.post("/update-quotation-profile/:id", updateQuotation);
router.post("/update-flight-profile/:id", updateFlightProfile);
router.post("/update-insurance-profile/:id", updateInsuranceProfile);
router.post("/update-transfer-profile/:id", updateTransferProfile);
router.post("/update-attraction-profile/:id", updateAttractionProfile);
router.post("/update-single-transfer-profile/:id", updateSingleTransferProfile);
router.post("/update-all-transfer-profile/:id", updateAllTransferProfile);

router.post("/update-hotel-profile/:id", updateHotelRoomType);
router.post("/update-hotel-markup-profile/:id", updateHotelMarkup);

router.post("/clone-profile/:profileId", cloneMarket);

router.delete("/delete-profile/:id", deleteProfile);

// For creating a profile
router.get("/get-all-profiles", getAllProfiles);
router.get("/get-all-attraction-activities/:profileId", getAllAttractionActivities);
router.get("/get-all-visatype/:profileId", getAllVisaType);
router.get("/get-all-a2atype/:profileId", getAlla2aTypes);
router.get("/get-all-category/:profileId/:provider", getAllCategory);
router.get("/get-all-hotels", getAllHotels);
router.get("/get-all-roomTypes/:hotelId/:profileId/:provider", getAllRoomTypes);
router.get("/get-all-hotel-markups/:hotelId/:profileId", getHotelMarkups);
router.get("/get-all-quotation/:profileId", getQuotationDetails);
router.get("/get-all-airlines/:profileId", getAllAirlines);
router.get("/get-all-insurance/:profileId", getAllInsurancePlans);
router.get("/get-all-transfer/:profileId", getAllTransfers);
router.get("/get-all-vehicle/:profileId/:transferId", getAllTransferVehciles);

//apply

router.patch("/admin/applyProfile", applyAdminMarketStrategy);
router.patch("/b2b/applyProfile", applyResellerMarketStrategy);

module.exports = router;
