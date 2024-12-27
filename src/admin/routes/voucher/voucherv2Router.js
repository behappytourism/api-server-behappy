const router = require("express").Router();

const {
    addNewVoucher,
    getAllVouchers,
    getSingleVoucherWithAllTours,
    getSingleVoucher,
    updateVoucher,
    getAllDailyReports,
    downloadVoucherExcel,
    downloadVoucherPdf,
    updateVoucherCancellationStatus,
    downloadVoucherExcelByTourType,
    updateVocherSingleTourStatus,
    getSingleTourDetailsWithTransfers,
    addVoucherSingleTourTransfer,
    deleteSingleVoucherTourVehicleSchedule,
    getTourTransfersInitialData,
    deleteSingleVoucher,
} = require("../../controllers/voucher/voucherv2Controller");

router.post("/add", addNewVoucher);
router.get("/all", getAllVouchers);
router.get("/single/:id/tours", getSingleVoucherWithAllTours);
router.get("/single/:id", getSingleVoucher);
router.patch("/update/:id", updateVoucher);
router.get("/daily-reports", getAllDailyReports);
router.patch("/cancellation/udpate", updateVoucherCancellationStatus);
router.get("/excel/download", downloadVoucherExcel);
router.get("/tour-type/excel/download", downloadVoucherExcelByTourType);
router.patch("/tour-status/update", updateVocherSingleTourStatus);
router.get("/:id/pdf/download", downloadVoucherPdf);
router.delete("/delete/:id", deleteSingleVoucher);

router.get("/:id/tours/:tourId", getSingleTourDetailsWithTransfers);
router.post("/tours/transfers/add", addVoucherSingleTourTransfer);
router.delete("/tours/transfers/:scheduleId", deleteSingleVoucherTourVehicleSchedule);
router.get("/tours/transfers/initial-data", getTourTransfersInitialData);

module.exports = router;
