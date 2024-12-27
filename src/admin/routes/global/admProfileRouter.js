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
    updateAttractionProfile,
    updateHotelRoomType,
    cloneProfile,
    getAllProfilesActivity,
    getAllTransfers,
    getAllTransferVehciles,
    updateSingleTransferProfile,
    updateAllTransferProfile,
    updateTransferProfile,
    getAllB2bProfilesForActivity,
    updateSelectedB2bProfileChangedActivity,
    updateProfileChanged,
    updateAllProfileActivity,
    getHotelMarkups,
    updateHotelMarkup,
} = require("../../controllers/global/adminB2BProfileController");

router.post("/add-profile", addProfile);
router.post("/update-activities-profile/:id", updateActivityProfile);
router.post("/update-visa-profile/:id", updateVisaProfile);
router.post("/update-a2a-profile/:id", updateA2aProfile);
router.post("/update-starCategory-profile/:id", updateStarCategory);
router.post("/update-roomType-profile/:id", updateRoomType);
router.post("/update-hotel-profile/:id", updateHotelRoomType);
router.post("/update-hotel-markup-profile/:id", updateHotelMarkup);

router.post("/update-quotation-profile/:id", updateQuotation);
router.post("/update-flight-profile/:id", updateFlightProfile);
router.post("/update-insurance-profile/:id", updateInsuranceProfile);
router.post("/update-attraction-profile/:id", updateAttractionProfile);
router.post("/update-single-transfer-profile/:id", updateSingleTransferProfile);
router.post("/update-all-transfer-profile/:id", updateAllTransferProfile);
router.post("/update-transfer-profile/:id", updateTransferProfile);
router.post("/update-all-b2b-profile-activity/:profileId", updateAllProfileActivity);
router.post("/update-profile-activity/:profileId", updateProfileChanged);
router.post(
    "/update-selected-b2b-profile-activity/:profileId",
    updateSelectedB2bProfileChangedActivity
);

router.post("/clone-profile/:profileId", cloneProfile);

router.delete("/delete-profile/:id", deleteProfile);

// For creating a profile
router.get("/get-all-profiles", getAllProfiles);
router.get("/get-all-profiles/:activityId", getAllProfilesActivity);

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

router.get("/get-all-b2b-profiles/:profileId/:activityId", getAllB2bProfilesForActivity);
module.exports = router;
