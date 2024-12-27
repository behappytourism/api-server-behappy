const router = require("express").Router();

const {
    addNewRoomOccupancy,
    deleteRoomOccupancy,
    getAllRoomOccupancies,
    updateRoomOccupancy,
    getSingleRoomOccupancy,
} = require("../../controllers/hotel/admRoomOccupanciesController");

router.post("/add", addNewRoomOccupancy);
router.patch("/update/:id", updateRoomOccupancy);
router.get("/all", getAllRoomOccupancies);
router.delete("/delete/:id", deleteRoomOccupancy);
router.get("/single/:id", getSingleRoomOccupancy);

module.exports = router;
