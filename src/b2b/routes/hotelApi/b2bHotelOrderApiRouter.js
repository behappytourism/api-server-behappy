const router = require("express").Router();
const { apiAccess } = require("../../middlewares");

const {
    createB2BHotelOrderApi,
    completeB2BHotelOrder,
    getSingleAllOrdersB2b,
    getSingleHotelOrderApi,
    cancelB2bHotelOrderApi,
    downloadHotelOrderVoucher,
} = require("../../controllers/hotelApi/b2bHotelApiOrderController");

// check access for this routes in user
const hotelAccessMiddleware = apiAccess("Hotel");

router.post("/create", hotelAccessMiddleware, createB2BHotelOrderApi);
router.post("/:orderId/complete", hotelAccessMiddleware, completeB2BHotelOrder);
router.get("/all-orders", hotelAccessMiddleware, getSingleAllOrdersB2b);
router.get("/single-order/:orderId", hotelAccessMiddleware, getSingleHotelOrderApi);
router.post("/cancel/:orderId", hotelAccessMiddleware, cancelB2bHotelOrderApi);
router.get("/voucher/:orderId", hotelAccessMiddleware, downloadHotelOrderVoucher);

module.exports = router;
