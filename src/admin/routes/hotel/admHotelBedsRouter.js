const router = require("express").Router();

const {
    loadHotels,
    loadBoardTypes,
    loadHotelAmenities,
    loadAccommodationTypes,
    loadRoomTypes,
    loadHotelChains,
    loadHotelRateComments,
    addAllHotelBedRoomTypeToMain,
    deleteAllRoomTypesLoadedFromHb,
    loadCitiesAndAreas,
    loadCountriesAndStates,
} = require("../../controllers/hotel/admHotelBedsController");

router.post("/load/board-types", loadBoardTypes);
router.post("/load/hotels", loadHotels);
router.post("/load/amenities", loadHotelAmenities);
router.post("/load/accommodation-types", loadAccommodationTypes);
router.post("/load/room-types", loadRoomTypes);
router.post("/load/chains", loadHotelChains);
router.post("/load/countries-states", loadCountriesAndStates);
router.post("/load/cities-areas", loadCitiesAndAreas);
router.post("/load/rate-comments", loadHotelRateComments);
router.post("/add-hb-room-to-main", addAllHotelBedRoomTypeToMain);
router.delete("/delete-hb-loaded-rmtypes", deleteAllRoomTypesLoadedFromHb);

module.exports = router;
