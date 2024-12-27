const router = require("express").Router();

const {
    addNewA2a,
    listAllA2a,
    getSingleA2A,
    deleteA2a,
    updateA2a,
    getAllAirports,
} = require("../../controllers/a2a/admA2aController");

router.post("/add", addNewA2a);
router.get("/all", listAllA2a);
router.get("/airports/all", getAllAirports);

router.get("/single/:id", getSingleA2A);
router.delete("/delete/:id", deleteA2a);
router.patch("/update/:id", updateA2a);

module.exports = router;
