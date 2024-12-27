const router = require("express").Router();
const {
    addB2bSingleProfile,
    getSingleB2bProfileDetails,
    updateB2bProfile,
    getB2bSelectedProfile,
    updateAllB2bProfile,
    updateAllB2bProfileChanged,
    getProfileB2b,

    //

    addProfile,
    updateProfile,
    deleteProfile,
    getAllProfiles,
    getAllAttractionActivities,
    getAllVisaType,
    getAlla2aTypes,
    getSingleProfileDetails,
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
    updateHotelArray,
    getAllAirlines,
    updateFlightProfile,
    updateInsuranceProfile,
    getAllInsurancePlans,
} = require("../../controllers/global/admSingleAdminMarkupProfileController");

router.post("/applyProfile", addB2bSingleProfile);
router.get("/get-selected/:resellerId", getB2bSelectedProfile);
router.put("/update-profile/:resellerId", updateB2bProfile);
router.patch("/update-all-profile/:profileId", updateAllB2bProfile);
router.patch("/update-all-profile/edit/:profileId", updateAllB2bProfileChanged);
router.get("/resellers/:profileId", getProfileB2b);

///
router.post("/add-profile", addProfile);
router.post("/update-activities-profile/:id", updateActivityProfile);
router.post("/update-visa-profile/:id", updateVisaProfile);
router.post("/update-a2a-profile/:id", updateA2aProfile);
router.post("/update-starCategory-profile/:id", updateStarCategory);
router.post("/update-roomType-profile/:id", updateRoomType);
router.post("/update-quotation-profile/:id", updateQuotation);
router.post("/update-flight-profile/:id", updateFlightProfile);
router.post("/update-insurance-profile/:id", updateInsuranceProfile);

router.delete("/delete-profile/:id", deleteProfile);

// For creating a profile
router.get("/get-all-attraction-activities/:profileId", getAllAttractionActivities);
router.get("/get-all-visatype/:profileId", getAllVisaType);
router.get("/get-all-a2atype/:profileId", getAlla2aTypes);
router.get("/get-all-category/:profileId", getAllCategory);
router.get("/get-all-hotels", getAllHotels);
router.get("/get-all-roomTypes/:hotelId/:profileId", getAllRoomTypes);
router.get("/get-all-quotation/:profileId", getQuotationDetails);
router.get("/get-all-airlines/:profileId", getAllAirlines);
router.get("/get-all-insurance/:profileId", getAllInsurancePlans);

router.get("/update-hotel", updateHotelArray);

module.exports = router;
