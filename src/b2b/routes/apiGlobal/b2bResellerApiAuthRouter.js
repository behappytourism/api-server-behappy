const router = require('express').Router()
const {
    resellerApiLogin,
    getNewAccessToken
} = require('../../controllers/apiGlobal/resellerApiAuthController')


router.post("/login", resellerApiLogin)
router.get("/token", getNewAccessToken)

module.exports = router;