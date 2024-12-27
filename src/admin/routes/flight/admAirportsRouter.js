const router = require("express").Router();

const {
    getAllAirports,
    addNewAirport,
    deleteAirport,
    getSingleAirport,
    updateAirport,
    updateAirportTerminals,
    getSingleAirportTerminals,
    deleteAirportTerminal,
} = require("../../controllers/flight/admAirportsController");

router.get("/all", getAllAirports);
router.get("/single/:id", getSingleAirport);
router.post("/add", addNewAirport);
router.patch("/update/:id", updateAirport);
router.delete("/delete/:id", deleteAirport);
router.patch("/update/terminal/:id", updateAirportTerminals);
router.get("/terminal/:id", getSingleAirportTerminals);
router.delete("/terminal/:id/delete/:terminalId", deleteAirportTerminal);

module.exports = router;
