const router = require("express").Router();

const {
    getAllEmailFooters,
    addNewEmailFooter,
    deleteEmailFooter,
    getSingleEmailFooter,
    updateEmailFooter,
    getAllEmailFootersList,
} = require("../../controllers/email/admEmailFooterController");

router.get("/all", getAllEmailFooters);
router.get("/single/:id", getSingleEmailFooter);
router.post("/add", addNewEmailFooter);
router.patch("/update/:id", updateEmailFooter);
router.delete("/delete/:id", deleteEmailFooter);
router.get("/list", getAllEmailFootersList);

module.exports = router;
