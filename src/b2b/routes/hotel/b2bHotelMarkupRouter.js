const router = require("express").Router();

const {
    upsertB2bClientHotelMarkup,
    upsertB2bSubAgentHotelMarkup,
    listAllRoomTypeWithStarCategory,
    getAllCategory,
    getAllHotels,
    getAllRoomTypes,
    upsertB2bClientCategoryMarkup,
    upsertB2bSubAgentCategoryMarkup,
    getAllRoomTypesSubAgent,
    getAllCategorySubAgent,
} = require("../../controllers/hotel/b2bHotelMarkupController");
const { b2bAuth } = require("../../middlewares");

//get client
router.get("/list-categroy", b2bAuth, getAllCategory);
router.get("/list-hotel", b2bAuth, getAllHotels);
router.get("/list-room-type/:hotelId", b2bAuth, getAllRoomTypes);

//get agent
router.get("/list-categroy/:resellerId", b2bAuth, getAllCategorySubAgent);
router.get("/list-room-type/:hotelId/:resellerId", b2bAuth, getAllRoomTypesSubAgent);

//update room type
router.patch("/client/room-type/upsert", b2bAuth, upsertB2bClientHotelMarkup);
router.patch("/sub-agent/room-type/upsert", b2bAuth, upsertB2bSubAgentHotelMarkup);

//update star category

router.patch("/client/star-category/upsert", b2bAuth, upsertB2bClientCategoryMarkup);
router.patch("/sub-agent/star-category/upsert", b2bAuth, upsertB2bSubAgentCategoryMarkup);

module.exports = router;
