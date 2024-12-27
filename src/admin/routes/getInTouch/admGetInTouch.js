const router = require('express').Router()

const { getUsersMessages } = require('../../controllers/GetInTouch/getInTouch')

router.get("/getUser-messages", getUsersMessages)

module.exports = router