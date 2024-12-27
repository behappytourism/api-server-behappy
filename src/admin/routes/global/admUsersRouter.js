const router = require("express").Router();

const {
    getAllUsers,
    getSingleUserDetails,
    createUserExcelSheet,
    getAllUsersList,
} = require("../../controllers/global/admUsersController");

router.get("/all", getAllUsers);
router.get("/single/:userId/details", getSingleUserDetails);
router.get("/all-excelSheet", createUserExcelSheet);
router.get("/all/list", getAllUsersList);

module.exports = router;
